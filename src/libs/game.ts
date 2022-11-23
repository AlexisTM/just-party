import { encode, decode } from 'cborg'

enum CLIENT_TYPES {
    Unknown = 0,
    Host = 1,
    Player = 2,
};
class Game {
    ws?: WebSocket = undefined;
    type: CLIENT_TYPES;

    constructor() {
        this.ws = undefined;
        this.type = CLIENT_TYPES.Unknown;
    }

    is_host() {
        return this.type == CLIENT_TYPES.Host;
    }

    is_player() {
        return this.type == CLIENT_TYPES.Player;
    }

    is_unknown() {
        return this.type == CLIENT_TYPES.Unknown;
    }

    join(roomid: string) {
        if (roomid.length == 4) {
            if (this.conn_start(roomid)) {
                this.type = CLIENT_TYPES.Player;
                return true;
            }
        }
        return false;
    }

    create() {
        if (this.conn_start("CREATE")) {
            this.type = CLIENT_TYPES.Host;
            return true;
        }
        return false;
    }

    conn_start(game: string) {
        try {
            if (this.ws != undefined && (this.ws.readyState == 2 || this.ws.readyState == 3)) {
                this.ws.onclose = () => { };
                this.ws.onerror = () => { };
                this.ws.onopen = () => { };
                this.ws.onmessage = () => { };
                this.ws.close();
                this.ws = undefined;
            }
            if (this.ws == undefined) {
                let type = undefined;
                if (game == 'CREATE') {
                    this.on_log('[CONNECTING] Creating a game');
                } else {
                    this.on_log('[CONNCETING] Joining the game: ' + game);
                }
                this.ws = new WebSocket('ws://127.0.0.1:8081/' + game);
                this.ws.binaryType = 'arraybuffer';
                this.ws.onclose = (a) => { this.on_ws_close(a); this.on_log('[CLOSED] Code: ' + a.code + ' Reason: \"' + a.reason + '\"'); }
                this.ws.onerror = (a) => { this.on_log('[ERROR]'); }
                this.ws.onopen = (a) => { this.on_log('[OPENED]'); }
                this.ws.onmessage = (a) => {
                    if (this.is_host()) {
                        let msg = decode(new Uint8Array(a.data));
                        this.on_log("[MESSAGE IN] " + JSON.stringify(msg));
                        if (msg.cmd == 'prepare_reply') {
                            this.on_prepare_reply(msg);
                        } else if (msg.cmd == 'from') {
                            this.on_player_data(msg);
                        } else if (msg.cmd == 'from_str') {
                            this.on_player_data(msg);
                        } else if (msg.cmd == 'stop') {
                            this.on_stop(msg);
                        } else if (msg.cmd == 'error') {
                            this.on_error(msg);
                        } else if (msg.cmd == 'state') {
                            this.on_state(msg);
                        } else {
                            this.on_log('[MESSAGE IN] Unknown message: ' + a.data);
                        }
                    } else {
                        if (typeof (a.data) == 'string') {
                            this.on_host_str(a.data);
                        } else {
                            this.on_host_bin(a.data);
                        }
                    }
                };
                return true;
            }
            else {
                this.on_log('[CONNECTING] The websocket is already connecting.');
            }
            return false;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    send(val: any) {
        if (this.ws != undefined && this.ws.readyState == 1) {
            this.ws.send(val);
        } else {
            this.on_log('[MESSAGE OUT] The websocket is not (Yet?) connected.');
        }
    }

    send_cbor(val: any) {
        this.on_log('[MESSAGE OUT] Data sent: ' + JSON.stringify(val));
        this.send(encode(val).buffer);
    }

    prepare(max_players: Number) {
        this.send_cbor({
            cmd: 'prepare',
            max_players: Number(max_players),
        });
    }

    start() {
        this.send_cbor({
            cmd: 'start',
        })
    }

    kick(player: Number) {
        this.send_cbor({
            cmd: 'kick',
            player,
        })
    }

    stop() {
        this.send_cbor({
            cmd: 'stop',
        })
    }

    // to is an array of user id
    // Data is a raw data (an array or CBOR encoded object)
    to(to: Array<Number>, data: any) {
        this.send_cbor({
            cmd: 'to',
            to,
            data: data, // CBOR cannot serialize its own output, and Uint8Array is not recognized Rust's side
        })
    }

    // to is an array of user id
    // Data will be cbor encoded
    to_cbor(to: Array<Number>, data: any) {
        // CBOR fails to serialize bytearray (its output)
        // serde (ciborium) fails to deserialize the output of this CBOR using Uint8Array
        // Thus converting it all the way to an array in a triple copy design patter.
        // const typedArray = new Uint8Array(data);
        // const array = [...typedArray];
        const array = [...encode(data)]
        this.to(to, array)
    }

    // to is an array of user id
    // Data is a string
    to_str(to: Array<Number>, data: string) {
        this.send_cbor({
            cmd: 'to_str',
            to,
            data,
        })
    }

    // Player callbacks
    on_host_bin(data: any) {
        this.on_log('[MESSAGE IN] ' + JSON.stringify(data));
    }
    on_host_str(data: any) {
        this.on_log('[MESSAGE IN] ' + data);
    }
    // Host callbacks
    on_prepare_reply(data: any) {
        this.on_log('[PREPARE_REPLY] Game key: ' + data.key);
    }
    on_player_data(data: any) {
        this.on_log('[PLAYER_DATA] ' + data.from + ' sent: ' + data.data);
    }
    on_stop(data: any) {
        this.on_log('[STOP]');
    }
    on_error(data: any) {
        this.on_log('[ERROR] reason: ' + data.reason);
    }
    on_state(data: any) {
        this.on_log('[STATE] players: ' + JSON.stringify(data));
    }

    // Configuration related
    on_log(logdata: string) { }
    on_ws_close(data: any) {
        this.on_log('[CLOSED] Code: ' + data.code + ' Reason: \"' + data.reason + '\"');
    }
};

export default Game
