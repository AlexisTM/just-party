<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';

export default defineComponent({
    data() {
        return {
            roomid: '',
            data_to_send: '{"Hey": "oooh"}',
            game: new Game(),
        }
    },
    mounted() {
        this.game.on_host_str = (data: any) => {
            console.log("Str data: ", data);
        }
        this.game.on_host_bin = (data: any) => {
            console.log("Bin data: ", decode(new Uint8Array(data)), " from message:", data);
        }
        this.game.on_ws_close = (data: any) => {
            console.log(data);
            router.push('/');
        }
        this.roomid = this.$route.params.roomid as string;
        if (!this.game.join(this.roomid)) {
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
            <div class="field">
                <label class="label">Input</label>
                <div class="control has-icons-left">
                    <input type="text" placeholder="{'some': 'data'}" v-model="data_to_send" class="input"
                        @keyup.enter="game.send(data_to_send)">
                    <span class="icon is-small is-left">
                        <i class="fa fa-envelope"></i>
                    </span>
                </div>
            </div>
            <div class="field">
                <a class="button is-success is-fullwidth" v-on:click="game.send(data_to_send)">
                    Send as string
                </a>
            </div>
            <div class="field">
                <a class="button is-success is-fullwidth" v-on:click="game.send_cbor(data_to_send)">
                    Send as CBOR
                </a>
            </div>
        </div>
    </div>
</template>
