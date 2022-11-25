<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';
import type CadavreRequest from './comm';

export default defineComponent({
    data() {
        return {
            roomid: '',
            players: [],
            max_players: 8,
            accept_players: false,
            data_dest: "[]",
            data_to_send: '{"id": 1}',
            game: new Game(),
            request: {
                id: 0,
                prompt: 'Choose a username',
                type: 'input',
                input_default: 'Someone good',
                button: 'Send',
            } as CadavreRequest,

        }
    },
    mounted() {
        this.game.on_prepare_reply = (data: any) => {
            this.roomid = data.key;
        };
        this.game.on_player_data = (data: any) => {
            console.log(data);
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
        if (!this.game.create()) {
            router.push('/');
        }
    },
    methods: {
        stop() { this.game.stop(); },
        send() {
            this.game.to_str(JSON.parse(this.data_dest), JSON.stringify(this.request))
        }
    }
})
</script>

<template>
    <div class="column is-5-tablet is-4-desktop is-3-widescreen">
        <div class="box">
            <div class="field">Room ID: {{ roomid }}</div>
            <div class="field">Players: {{ players }}</div>
            <div class="field">Accept more players: {{ accept_players }}</div>
            <div class="field">
                <label class="label">Max players</label>
                <div class="control has-icons-left">
                    <input type="text" placeholder="8" v-model="max_players" class="input">
                </div>
            </div>
            <a class="field button is-success is-fullwidth" v-on:click="game.prepare(max_players, 'cadvrs')">
                Prepare
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="game.start()">
                Start
            </a>
            <div class="field">
                <label class="label">To: </label>
                <div class="control has-icons-left">
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
                <label class="label">Prompt:</label>
                <div class="control has-icons-left">
                    <input type="text" v-model="request.prompt" class="input">
                </div>
            </div>
            <div class="field">
                <label class="label">Input placeholder:</label>
                <div class="control has-icons-left">
                    <input type="text" v-model="request.input_default" class="input">
                </div>
            </div>
            <div class="field">
                <label class="label">Button text:</label>
                <div class="control has-icons-left">
                    <input type="text" v-model="request.button" class="input">
                </div>
            </div>
            <a class="field button is-success is-fullwidth" v-on:click="send()">
                Send the request
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="stop()">
                End the game
            </a>
        </div>
    </div>

</template>
