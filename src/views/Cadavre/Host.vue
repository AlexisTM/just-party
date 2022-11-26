<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';
import type { CadavreRequest, CadavreResponse, RequestType } from './comm';


/// TODOES:
///   Remove players leaving

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
    Adjective,
}

enum GameState {
    PreparingGame = 0,
    PrepareRound,
    RoundAsk,
    RoundShow,
    MiddleScore,
    FinalScores,
}

interface PlayerRoundData {
    player: number;
    type: ResponseType;
    result: string;
}

interface PlayerRound {
    [key: number]: PlayerRoundData
}

interface Round {
    winner: number;
    data: PlayerRound;
}

interface PlayerData {
    player: number;
    username: string;
    vip: boolean;
}

interface Players {
    [key: number]: PlayerData
}

export default defineComponent({
    data() {
        return {
            roomid: '',
            players: [],
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
                current_round: 0,
            },
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

                    break;
                }
                case ResponseType.VIPReplay: {

                    break;
                }
                case ResponseType.Idle: {
                    // Nothing should come in.
                    break;
                }
                case ResponseType.Subject:
                case ResponseType.SubjectComplement:
                case ResponseType.Verb:
                case ResponseType.Adjective: {
                    this.game_data.rounds[this.game_data.current_round].data[player] = {
                        player: data.from,
                        type: player_response_type,
                        result: player_data,
                    } as PlayerRoundData;
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
        send_vip_start_request(dest: Array<number>) {
            this.send(dest, {
                id: ResponseType.VIPStart,
                prompt: 'Start the game!',
                type: 'button',
                input_default: 'start',
                button: 'Everybody is in',
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
                            this.send_vip_start_request([vip.player]);
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
                    this.send_game_request([], ResponseType.Subject, "Give me a subject", "A knight");
                    this.game_data.rounds.push({ winner: -1, data: {} });
                    this.game_data.current_round = this.game_data.rounds.length - 1;
                    this.game_data.state = GameState.RoundAsk;
                    break;
                }
                case GameState.RoundAsk: {
                    // If all in, got to next
                    break;
                }
                case GameState.RoundShow: {
                    // Show results!
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
            <a class="field button is-success is-fullwidth" v-on:click="start()">
                Start
            </a>
            <div class="field">
                <label class="label">To: </label>
                <div class="control">
                    <input type="text" placeholder="[]" v-model="data_dest" class="input">
                </div>
            </div>
            <div class="field select is-fullwidth">
                <select v-model="request.type">
                    <option value="input">Input</option>
                    <option value="button">Button</option>
                    <option value="">Idle</option>
                </select>
            </div>
            <div class="field">
                <label class="label">Request ID:</label>
                <div class="control">
                    <input type="number" v-model="request.id" class="input">
                </div>
            </div>
            <div class="field">
                <label class="label">Prompt:</label>
                <div class="control">
                    <input type="text" v-model="request.prompt" class="input">
                </div>
            </div>
            <div class="field">
                <label class="label">Input placeholder:</label>
                <div class="control">
                    <input type="text" v-model="request.input_default" class="input">
                </div>
            </div>
            <div class="field">
                <label class="label">Button text:</label>
                <div class="control">
                    <input type="text" v-model="request.button" class="input">
                </div>
            </div>
            <a class="field button is-success is-fullwidth" v-on:click="send_test()">
                Send the request
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="stop()">
                End the game
            </a>
        </div>
    </div>

</template>
