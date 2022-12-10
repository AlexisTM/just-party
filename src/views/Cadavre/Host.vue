<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';
import type { CadavreRequest, CadavreResponse, ColoredResult } from './comm';
import { RequestId, RequestType } from './comm';
import { all } from 'axios';

interface Scores {
    [key: number]: number
}

enum GameState {
    PreparingGame = 0,
    PrepareRound,
    RoundAsk,
    RoundResultCompute,
    RoundShow,
    MiddleScore,
    FinalScores,
}

interface PlayerRoundData {
    player: number;
    subject: string;
    verb: string;
    complement: string;
    time_complement: string;
}

interface PlayerRound {
    [key: number]: PlayerRoundData
}

interface Round {
    winner: number;
    data: PlayerRound;
    results: Array<ColoredResult>;
}

interface PlayerData {
    player: number; // Player ID
    username: string; // Username
    vip: boolean; // One VIP, the "owner" of the room
    done: boolean; // Current task is done
    class: string;
}

interface Players {
    [key: number]: PlayerData
}

const shuffle_in_place = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

const COLORS = [
    'has-text-info',
    'has-text-success',
    'has-text-warning',
    'has-text-danger',
    'has-text-info-dark',
    'has-text-success-dark',
    'has-text-warning-dark',
    'has-text-danger-dark',
    'has-text-primary',
    'has-text-link',
    'has-text-primary-dark',
    'has-text-link-dark',
];

export default defineComponent({
    data() {
        return {
            roomid: '',
            players: [] as Array<number>,
            max_players: 8,
            accept_players: false, // Information from the main server
            data_dest: "[]", //
            game: new Game(),
            request: {
                id: 0 as RequestId,
                prompt: 'Choose a username',
                type: RequestType.Input,
                input_default: 'Someone good',
                button: 'Send',
                value: [],
            } as CadavreRequest,
            timer_s: 0,
            players_data: {} as Players,
            done_count: 0,
            game_data: {
                state: GameState.PreparingGame,
                scores: {} as Scores,
                rounds: [] as Array<Round>,
                results: [],
                current_round: 0,
            },
            GameState: GameState,
            current_color: 0,
        }
    },
    mounted() {
        // Websocket triggers
        this.game.on_prepare_reply = (data: any) => {
            this.roomid = data.key;
        };
        this.game.on_player_data = (data: any) => {
            const player = data.from;
            const player_reply = JSON.parse(data.data) as CadavreResponse;
            const player_response_type = player_reply.id as RequestId;
            const player_data = player_reply.value;

            switch (player_response_type) {
                case RequestId.Username: {
                    this.players_data[player] = {
                        player: player,
                        username: player_data,
                        vip: false,
                        done: false,
                        class: COLORS[this.current_color],
                    } as PlayerData;
                    this.current_color += 1;

                    if (this.players_data[player].username != "") { // If we have a name, make it wait to start;
                        this.send_idle_request([player], 'Waiting for the game to start');
                    } else {
                        this.send_username_request([player]);
                    }
                    break;
                }
                case RequestId.VIPStart: {
                    this.game.start(); // Prevent more people to join
                    this.game_data.state = GameState.PrepareRound;
                    break;
                }
                case RequestId.VIPRestart: {
                    this.game_data.state = GameState.PrepareRound;
                    break;
                }
                case RequestId.VIPResultReplay: {
                    this.game_data.state = GameState.PrepareRound;
                    break;
                }
                case RequestId.Idle: {
                    // Nothing should come in.
                    break;
                }
                case RequestId.Subject: {
                    this.game_data.rounds[this.game_data.current_round].data[player].subject = player_data;
                    this.send_game_request([player], RequestId.Verb, "Give me a verb", "eats");
                    break;
                }
                case RequestId.Verb: {
                    this.game_data.rounds[this.game_data.current_round].data[player].verb = player_data;
                    this.send_game_request([player], RequestId.SubjectComplement, "Give me a subject complement", "an apple");
                    break;
                }
                case RequestId.SubjectComplement: {
                    this.game_data.rounds[this.game_data.current_round].data[player].complement = player_data;
                    this.send_game_request([player], RequestId.TimeComplement, "Give time complement", "in summer");
                    break;
                }
                case RequestId.TimeComplement: {
                    this.game_data.rounds[this.game_data.current_round].data[player].time_complement = player_data;
                    this.send_idle_request([player], "Waiting for the other players..");
                    this.players_data[player].done = true;
                    break;
                }
            };
        };
        this.game.on_stop = (data: any) => {
            console.log(data);
        };
        this.game.on_error = (data: any) => {
            console.log(data);
        };
        this.game.on_state = (data: any) => {
            this.accept_players = data.accept_conns;
            this.players = data.players;
            console.log(data);
        };
        this.game.on_ws_close = (data: any) => {
            console.log(data);
            router.push('/');
        }
        this.game.on_player_joined = (data: any) => {
            const player = data.player as number;
            this.players_data[player] = {
                player: player,
                username: "",
                vip: (this.get_vip() == undefined), // True if no vip
                done: false,
                class: COLORS[0],
            } as PlayerData;
            this.send_username_request([player]);
            // If this wasn't the vip, cancel the ready button
        }
        this.game.on_player_left = (data: any) => {
            const player = data.player as number;
            delete this.players_data[player];
        }

        if (!this.game.create()) {
            router.push('/');
        }
        this.game_data.state = GameState.PreparingGame;

        if (this.timer_s == 0) {
            this.timer_s = setInterval(this.update, 1000);
        }
    },
    unmounted() {
        if (this.timer_s != 0) {
            clearInterval(this.timer_s);
            this.timer_s = 0;
        }
    },
    methods: {
        send(dest: Array<number>, request: CadavreRequest) {
            this.game.to_str(dest, JSON.stringify(request));
        },
        send_idle_request(dest: Array<number>, prompt: string) {
            this.send(dest, {
                id: RequestId.Idle,
                prompt: prompt,
                type: RequestType.Idle,
                input_default: '',
                button: '',
                value: [],
            });
        },
        send_username_request(dest: Array<number>) {
            this.send(dest, {
                id: RequestId.Username,
                prompt: 'Choose a username',
                type: RequestType.Input,
                input_default: 'John Smith',
                button: 'Set my name',
                value: [],
            });
        },
        send_vip_start_request() {
            let vip = this.get_vip() as PlayerData;
            this.send([vip.player], {
                id: RequestId.VIPStart,
                prompt: 'Start the game!',
                type: RequestType.Button,
                input_default: 'start',
                button: 'Everybody is in',
                value: [],
            });
        },
        send_vip_restart_request() {
            let vip = this.get_vip() as PlayerData;
            this.send([vip.player], {
                id: RequestId.VIPRestart,
                prompt: 'Play again with the same players!',
                type: RequestType.Button,
                input_default: 'restart',
                button: 'Restart',
                value: [],
            });
        },
        send_game_request(dest: Array<number>, type: RequestId, prompt: string, input_default: string) {
            this.send(dest, {
                id: type,
                prompt: prompt,
                type: RequestType.Input,
                input_default: input_default,
                button: 'Send',
                value: [],
            });
        },
        send_game_result(result: Array<ColoredResult>) {
            let players = [... this.players];
            const vip = this.get_vip() as PlayerData;
            if (typeof(vip) == 'object') {
                let index = players.indexOf(vip.player);
                delete players[index];
            }
            this.send(players, {
                id: RequestId.Result,
                prompt: 'Here are the results!',
                type: RequestType.Output,
                input_default: '',
                button: '',
                value: result,
            });

            this.send([vip.player], {
                id: RequestId.VIPResultReplay,
                prompt: 'Here are the results!',
                type: RequestType.OutputButton,
                input_default: '',
                button: 'Play again',
                value: result,
            });
        },
        all_players_have_username(): boolean {
            const player_without_username = (<any>Object).values(this.players_data).find((data: PlayerData) => data.username == "");
            return player_without_username == undefined;
        },
        get_vip() {
            const all_players = (<any>Object).values(this.players_data) as Array<PlayerData>;
            if (all_players.length == 0) {
                return undefined;
            }
            const vip = all_players.find((data: PlayerData) => data.vip == true);
            if (vip == undefined) {
                const new_vip = all_players[Math.floor(Math.random() * all_players.length)];
                // Select a vip
                this.players_data[new_vip.player].vip = true;
                return this.players_data[new_vip.player];
            } else {
                return vip;
            }
        },
        stop() { this.game.stop(); },
        start() {
            this.game.start();
            this.game_data.state = GameState.PreparingGame;
        },
        send_test() {
            this.request.id = Number(this.request.id);
            this.game.to_str(JSON.parse(this.data_dest), JSON.stringify(this.request))
        },
        update() {
            const now = Date.now();
            switch (this.game_data.state) {
                case GameState.PreparingGame: {
                    let vip = this.get_vip() as PlayerData;
                    if (vip != undefined) {
                        if (this.all_players_have_username()) {
                            this.send_vip_start_request();
                        } else {
                            if (vip.username == "") {
                                // Wait for the vip to send the username
                            } else {
                                this.send_idle_request([vip.player], "Waiting for everybody to be ready.");
                            }
                        }
                    } 8
                    // If there is no vip, nobody is in.
                    break;
                }
                case GameState.PrepareRound: {
                    this.game_data.rounds.push({ winner: -1, data: {}, results: [] });
                    this.game_data.current_round = this.game_data.rounds.length - 1;
                    this.game_data.state = GameState.RoundAsk;

                    for (let player of this.players) {
                        this.players_data[player].done = false;
                        this.game_data.rounds[this.game_data.current_round].data[player] = {
                            player: player,
                            subject: '',
                            verb: '',
                            complement: '',
                            time_complement: '',
                        } as PlayerRoundData;
                    }
                    this.send_game_request([], RequestId.Subject, "Give me a subject", "A knight");
                    break;
                }
                case GameState.RoundAsk: {
                    const players_data = (<any>Object).values(this.players_data);
                    this.done_count = (<any>Object).values(this.players_data).reduce((acc: number, data: PlayerData) => {
                        if (data.done) {
                            return acc + 1;
                        }
                        return acc;
                    }, 0);
                    if (this.players.length == this.done_count) {
                        this.game_data.state = GameState.RoundResultCompute;
                    }
                    console.log(this.done_count, this.players.length);
                    break;
                }
                case GameState.RoundResultCompute: {
                    const all_data: Array<PlayerRoundData> = (<any>Object).values(this.game_data.rounds[this.game_data.current_round].data);
                    const all_data_keys: Array<number> = (<any>Object).keys(this.game_data.rounds[this.game_data.current_round].data);

                    let subject_left: Array<number> = structuredClone(all_data_keys);
                    let verb_left: Array<number> = structuredClone(all_data_keys);
                    let complement_left: Array<number> = structuredClone(all_data_keys);
                    let time_complement_left: Array<number> = structuredClone(all_data_keys);

                    shuffle_in_place(subject_left);
                    shuffle_in_place(verb_left);
                    shuffle_in_place(complement_left);
                    shuffle_in_place(time_complement_left);

                    for (let i = 0; i < subject_left.length; i++) {
                        this.game_data.rounds[this.game_data.current_round].results.push({
                            subject: {
                                class: this.players_data[this.game_data.rounds[this.game_data.current_round].data[subject_left[i]].player].class,
                                value: this.game_data.rounds[this.game_data.current_round].data[subject_left[i]].subject,
                            },
                            time_complement: {
                                class: this.players_data[this.game_data.rounds[this.game_data.current_round].data[time_complement_left[i]].player].class,
                                value: this.game_data.rounds[this.game_data.current_round].data[time_complement_left[i]].time_complement,
                            },
                            complement: {
                                class: this.players_data[this.game_data.rounds[this.game_data.current_round].data[complement_left[i]].player].class,
                                value: this.game_data.rounds[this.game_data.current_round].data[complement_left[i]].complement,
                            },
                            verb: {
                                class: this.players_data[this.game_data.rounds[this.game_data.current_round].data[verb_left[i]].player].class,
                                value: this.game_data.rounds[this.game_data.current_round].data[verb_left[i]].verb,
                            },
                        });
                    }
                    this.game_data.state = GameState.RoundShow;
                    this.send_game_result(this.game_data.rounds[this.game_data.current_round].results);
                    this.send_vip_restart_request()
                    break;
                }
                case GameState.RoundShow: {
                    // Show this.game_data.rounds[this.game_data.current_round].results data in the HTML template
                    break;
                }
                case GameState.MiddleScore: {
                    // Show score
                    // Loop to prepare round, maybe some stage to switch between subject, verb, complement?
                    break;
                }
                case GameState.FinalScores: {
                    // Show some scores if any;
                    break;
                }
            }


        }

    }
})
</script>

<template>
    <div class="column is-5-tablet is-4-desktop is-3-widescreen">
        <div class="box">
            <div class="field">Current state: {{ game_data.state }}</div>
            <div class="field">All users are ready: {{ all_players_have_username() }}</div>
            <div class="field">Room ID: {{ roomid }}</div>
            <div class="field">Players: {{ players }}</div>
            <div class="field">Accept more players: {{ accept_players }}</div>
            <div class="field">
                <label class="label">Max players</label>
                <div class="control">
                    <input type="text" placeholder="8" v-model="max_players" class="input">
                </div>
            </div>
            <a class="field button is-success is-fullwidth" v-on:click="game.prepare(max_players, 'cadvrs')">
                Prepare
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="stop()">
                End the game
            </a>
        </div>
        <div class="box" v-if="game_data.state == GameState.RoundShow">
            <div class="field" v-for="value in (game_data.rounds[game_data.current_round].results)">
                <span class="has-text-weight-semibold" v-bind:class="value.subject.class">{{ value.subject.value }}
                    &nbsp;</span>
                <span class="has-text-weight-semibold" v-bind:class="value.verb.class">{{ value.verb.value }}
                    &nbsp;</span>
                <span class="has-text-weight-semibold" v-bind:class="value.complement.class">{{ value.complement.value
                }}
                    &nbsp;</span>
                <span class="has-text-weight-semibold" v-bind:class="value.time_complement.class">{{
                        value.time_complement.value
                }} &nbsp;</span>
            </div>
        </div>
    </div>

</template>
