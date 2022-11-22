<script lang="ts">
import { defineComponent } from 'vue';
import router from '../router';
import Game from '../libs/game';
import { decode } from 'cborg';

export default defineComponent({
    data() {
        return {
            roomid: '',
            players: [],
            max_players: 0,
            accept_players: false,
            data_dest: "[]",
            data_to_send: '{"Hey": "oooh"}',
            game: new Game(),
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
        stop() { console.log("STOP"); },
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
                    <span class="icon is-small is-left">
                        <i class="fa fa-envelope"></i>
                    </span>
                </div>
            </div>
            <a class="field button is-success is-fullwidth" v-on:click="game.prepare(max_players)">
                Prepare
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="game.start()">
                Start
            </a>
            <div class="field">
                <label class="label">To: </label>
                <div class="control has-icons-left">
                    <input type="text" placeholder="[]" v-model="data_dest" class="input">
                    <span class="icon is-small is-left">
                        <i class="fa fa-envelope"></i>
                    </span>
                </div>
            </div>
            <div class="field">
                <label class="label">Input str:</label>
                <div class="control has-icons-left">
                    <input type="text" placeholder="{'some': 'data'}" v-model="data_to_send" class="input"
                        @keyup.enter="game.to_str(JSON.parse(data_dest), data_to_send)">
                    <span class="icon is-small is-left">
                        <i class="fa fa-envelope"></i>
                    </span>
                </div>
            </div>
            <a class="field button is-success is-fullwidth"
                v-on:click="game.to_str(JSON.parse(data_dest), data_to_send)">
                Send as String
            </a>
            <a class="field button is-success is-fullwidth"
                v-on:click="game.to_cbor(JSON.parse(data_dest), data_to_send)">
                Send as CBOR
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="stop()">
                Stop
            </a>
        </div>
    </div>

</template>
