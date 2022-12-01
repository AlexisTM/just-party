<script lang="ts">
import { defineComponent } from 'vue';
import router from '../../router';
import Game from '../../libs/game';
import { decode } from 'cborg';
import type { CadavreRequest, CadavreResponse, RequestType, Image } from './comm';
import Sketchpad from 'responsive-sketchpad';

// Alternative sketchpad: https://vuejsexamples.com/create-a-drawing-app-that-uses-vuejs/
// Test at: https://codepen.io/Lewitje/pen/MVommB
// Alternative sketchpad: https://theisensanders.com/responsive-sketchpad/

export default defineComponent({
    data() {
        return {
            roomid: '',
            game: new Game(),
            request: {
                id: 0,
                prompt: 'The game is starting',
                type: '',
                input_default: '',
                button: '',
            } as CadavreRequest,
            reply_value: '',
            pad: {} as Partial<Sketchpad>,
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
        this.pad = new Sketchpad(document.getElementById('drawing') as HTMLElement, {
            line: {
                color: '#f44335',
                size: 5
            }
        });
    },
    methods: {
        send() {
            let res: CadavreResponse = {
                id: this.request.id,
                value: this.reply_value,
            };
            if (this.request.type == 'input') {
                if (this.reply_value.length > 0) { // Possible parameter, min_chars
                    this.game.send(JSON.stringify(res));
                }
            } else {
                this.game.send(JSON.stringify(res));
            }
        },
        pad_undo() {
            this.pad.undo?.();
        },
        pad_redo() {
            this.pad.redo?.();
        },
        pad_clear() {
            this.pad.clear?.();
        },
        pad_get_data() {
            if (typeof (this.pad.canvas) == "object") {
                let canvas = this.pad.canvas;
                let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
                let image = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let res: CadavreResponse = {
                    id: this.request.id,
                    value: this.reply_value,
                    image: {
                        data: new Uint8Array(image.data),
                        width: image.width,
                        height: image.height,
                    },
                };
                this.game.send_cbor(res);
            } else {
                console.log("No canvas is available it seems");
            }
        }

    }
})
</script>

<template>
    <div class="column is-5-tablet is-4-desktop is-3-widescreen">
        <div class="box">
            <div class="field">
                <label class="label">{{ request.prompt }}</label>
                <div class="control" v-show="request.type == 'input'">
                    <input type="text" v-bind:placeholder="request.input_default" v-model="reply_value" class="input"
                        @keyup.enter="send()">
                </div>
            </div>
            <div class="field">
                <a class="button is-success is-fullwidth" v-show="request.type == 'input' || request.type == 'button'"
                    v-on:click="send()">
                    {{ request.button }}
                </a>
            </div>
        </div>
        <div class="box">
            <div id="drawing"></div>
            <a class="field button is-success is-fullwidth" v-on:click="pad_undo()">
                undo
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="pad_redo()">
                redo
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="pad_clear()">
                clear
            </a>
            <a class="field button is-success is-fullwidth" v-on:click="pad_get_data()">
                get_data
            </a>
        </div>
    </div>
</template>
