<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';
import { RequestType, type CadavreRequest, type CadavreResponse, type ColoredResult } from './comm';

export default defineComponent({
    data() {
        return {
            roomid: '',
            game: new Game(),
            request: {
                id: 0,
                prompt: 'The game is starting',
                type: RequestType.Idle,
                input_default: '',
                button: '',
                value: [],
            } as CadavreRequest,
            reply_value: '',
            RequestType: RequestType,
        }
    },
    mounted() {
        this.game.on_host_str = (data: any) => {
            this.request = JSON.parse(data) as CadavreRequest;
            this.reply_value = '';
            console.log("Str data: ", this.request);
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
        send() {
            let res: CadavreResponse = {
                id: this.request.id,
                value: this.reply_value,
            };
            if (this.request.type == RequestType.Input) {
                if (this.reply_value.length > 0) { // Possible parameter, min_chars
                    this.game.send(JSON.stringify(res));
                }
            } else {
                this.game.send(JSON.stringify(res));
            }
        },
    }
})
</script>

<template>
    <div class="column is-5-tablet is-4-desktop is-3-widescreen">
        <div class="box">
            <div class="field">
                <label class="label">{{ request.prompt }}</label>
                <div class="control" v-show="request.type == RequestType.Input">
                    <input type="text" v-bind:placeholder="request.input_default" v-model="reply_value" class="input"
                        @keyup.enter="send()">
                </div>
            </div>
            <div class="field">
                <a class="button is-success is-fullwidth"
                    v-show="request.type == RequestType.Input || request.type == RequestType.Button"
                    v-on:click="send()">
                    {{ request.button }}
                </a>
            </div>
            <div v-if="request.type == RequestType.Output">
                <div class="field" v-for="value in (request.value)">
                    <span class="has-text-weight-semibold" v-bind:class="value.subject.class">{{ value.subject.value }}
                        &nbsp;</span>
                    <span class="has-text-weight-semibold" v-bind:class="value.verb.class">{{ value.verb.value }}
                        &nbsp;</span>
                    <span class="has-text-weight-semibold"
                        v-bind:class="value.complement.class">{{ value.complement.value }} &nbsp;</span>
                    <span class="has-text-weight-semibold"
                        v-bind:class="value.time_complement.class">{{ value.time_complement.value }} &nbsp;</span>
                </div>
            </div>
        </div>
    </div>
</template>
