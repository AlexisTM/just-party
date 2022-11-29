<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';
import type { CadavreRequest, CadavreResponse, RequestType, Image } from './comm';
import { all } from 'axios';


interface Scores {
    [key: number]: number
}

enum ResponseType {
    Idle = 0,
    Username,
    VIPStart, // Everybody is in
    VIPReplay, // Replay same players
    VIPRestart, // Replay new players
    Subject,
    Verb,
    SubjectComplement,
    TimeComplement,
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

interface Result {
    subject: {
        player: number;
        value: string;
    };
    verb: {
        player: number;
        value: string;
    };
    complement: {
        player: number;
        value: string;
    };
    time_complement: {
        player: number;
        value: string;
    };
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
    results: Array<Result>;
}

interface PlayerData {
    player: number; // Player ID
    username: string; // Username
    vip: boolean; // One VIP, the "owner" of the room
    done: boolean; // Current task is done
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
                id: 0,
                prompt: 'Choose a username',
                type: 'input',
                input_default: 'Someone good',
                button: 'Send',
            } as CadavreRequest,
            timer_s: 0,
            players_data: {} as Players,
            game_data: {
                state: GameState.PreparingGame,
                scores: {} as Scores,
                rounds: [] as Array<Round>,
                results: [],
                current_round: 0,
            },
            GameState: GameState,
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
            const player_response_type = player_reply.id as ResponseType;
            const player_data = player_reply.value;

            switch (player_response_type) {
                case ResponseType.Username: {
                    this.players_data[player] = {
                        player: player,
                        username: player_data,
                        vip: false,
                        done: false,
                    } as PlayerData;

                    if (this.players_data[player].username != "") { // If we have a name, make it wait to start;
                        this.send_idle_request([player], 'Waiting for the game to start');
                    } else {
                        this.send_username_request([player]);
                    }
                    break;
                }
                case ResponseType.VIPStart: {
                    this.game.start(); // Prevent more people to join
                    this.game_data.state = GameState.PrepareRound;
                    break;
                }
                case ResponseType.VIPRestart: {
                    this.game_data.state = GameState.PrepareRound;
                    break;
                }
                case ResponseType.VIPReplay: {

                    break;
                }
                case ResponseType.Idle: {
                    // Nothing should come in.
                    break;
                }
                case ResponseType.Subject: {
                    this.game_data.rounds[this.game_data.current_round].data[player].subject = player_data;
                    this.send_game_request([player], ResponseType.Verb, "Give me a verb", "eats");
                    break;
                }
                case ResponseType.Verb: {
                    this.game_data.rounds[this.game_data.current_round].data[player].verb = player_data;
                    this.send_game_request([player], ResponseType.SubjectComplement, "Give me a complement", "an apple");
                    break;
                }
                case ResponseType.SubjectComplement: {
                    this.game_data.rounds[this.game_data.current_round].data[player].complement = player_data;
                    this.send_game_request([player], ResponseType.TimeComplement, "Give time complement", "in summer");
                    break;
                }
                case ResponseType.TimeComplement: {
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

        console.log("MOUNTED")
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
                id: ResponseType.Idle,
                prompt: prompt,
                type: '',
                input_default: '',
                button: '',
            });
        },
        send_username_request(dest: Array<number>) {
            this.send(dest, {
                id: ResponseType.Username,
                prompt: 'Choose a username',
                type: 'input',
                input_default: 'John Smith',
                button: 'Set my name',
            });
        },
        send_vip_start_request() {
            let vip = this.get_vip() as PlayerData;
            this.send([vip.player], {
                id: ResponseType.VIPStart,
                prompt: 'Start the game!',
                type: 'button',
                input_default: 'start',
                button: 'Everybody is in',
            });
        },
        send_vip_restart_request() {
            let vip = this.get_vip() as PlayerData;
            this.send([vip.player], {
                id: ResponseType.VIPRestart,
                prompt: 'Play again with the same players!',
                type: 'button',
                input_default: 'restart',
                button: 'Restart',
            });
        },
        send_game_request(dest: Array<number>, type: ResponseType, prompt: string, input_default: string) {
            this.send(dest, {
                id: type,
                prompt: prompt,
                type: 'input',
                input_default: input_default,
                button: 'Send',
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
                    this.send_game_request([], ResponseType.Subject, "Give me a subject", "A knight");
                    break;
                }
                case GameState.RoundAsk: {
                    const not_done_player = (<any>Object).values(this.players_data).find((data: PlayerData) => (data.done == false));
                    if (not_done_player == undefined) {
                        this.game_data.state = GameState.RoundResultCompute;
                    }
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

                    console.log(subject_left, verb_left, complement_left, time_complement_left)
                    for (let i = 0; i < subject_left.length; i++) {
                        console.log(i);
                        this.game_data.rounds[this.game_data.current_round].results.push({
                            subject: {
                                player: this.game_data.rounds[this.game_data.current_round].data[subject_left[i]].player,
                                value: this.game_data.rounds[this.game_data.current_round].data[subject_left[i]].subject,
                            },
                            time_complement: {
                                player: this.game_data.rounds[this.game_data.current_round].data[time_complement_left[i]].player,
                                value: this.game_data.rounds[this.game_data.current_round].data[time_complement_left[i]].time_complement,
                            },
                            complement: {
                                player: this.game_data.rounds[this.game_data.current_round].data[complement_left[i]].player,
                                value: this.game_data.rounds[this.game_data.current_round].data[complement_left[i]].complement,
                            },
                            verb: {
                                player: this.game_data.rounds[this.game_data.current_round].data[verb_left[i]].player,
                                value: this.game_data.rounds[this.game_data.current_round].data[verb_left[i]].verb,
                            },
                        });
                        console.log(this.game_data.rounds[this.game_data.current_round].results);
                    }
                    this.game_data.state = GameState.RoundShow;
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
            <a class="field button is-success is-fullwidth" v-on:click="game.prepare(max_players, 'cadvrd')">
                Prepare
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="stop()">
                End the game
            </a>
        </div>
        <div class="box" v-if="game_data.state == GameState.RoundShow">
            <div v-for="{
                subject,
                verb,
                complement,
                time_complement
            } in game_data.rounds[game_data.current_round].results" class="field">
                {{ subject.value }} {{ verb.value }} {{ complement.value }} {{ time_complement.value }}
            </div>
        </div>
    </div>

</template>
