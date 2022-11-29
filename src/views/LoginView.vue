<script lang="ts">
import { defineComponent } from 'vue'
import router from '../router';
import axios from 'axios'

type LoginTab = 'join' | 'create';
type GameList = '' | 'test' | 'cadvrs' | 'cadvrd';

interface GameListNames {
  [key: string]: string
}

export default defineComponent({
  data() {
    return {
      tab: 'join' as LoginTab,
      roomid: '',
      game_to_start: 'cadvrs' as GameList, // To be created
      can_join: false, // The game type has been checked
      game_to_join: '' as GameList,
      game_names: {
        'test': 'Test mode',
        'cadvrs': 'Cadavre Exquis (string mode)',
        'cadvrd': 'Cadavre Exquis (Drawing mode)',
      } as GameListNames,
    }
  },
  methods: {
    join() {
      if (this.can_join) {
        router.push(`/${this.game_to_join}/player/${this.roomid.toUpperCase()}`);
      }
    },
    create() {
      router.push(`/${this.game_to_start}/host`);
    },
    gametype_fetcher() {
      if (this.roomid.length == 4) {
        this.can_join = false;
        this.game_to_join = '';
        let url = import.meta.env.VITE_URL as string;
        if (url == undefined) {
          url = window.location.hostname + ':8081';
        }
        let protocol = import.meta.env.VITE_PROTOCOL_HTTP as string;
        if (protocol == undefined) {
          protocol = "http";
        }
        axios.get(`${protocol}://${url}/${this.roomid.toUpperCase()}`).then((resp) => {
          this.game_to_join = resp.data;
          this.can_join = true;
        }).catch(
          () => {
            this.can_join = false;
            this.game_to_join = ''
          }
        )
      } else {
        this.can_join = false;
        this.game_to_join = ''
      }
    },
  }
})
</script>

<template>
  <div class="column is-5-tablet is-4-desktop is-3-widescreen">
    <div class="box">
      <div class="tabs is-centered is-toggle">
        <ul>
          <li class="" v-bind:class="{ 'is-active': tab == 'join' }"><a v-on:click="tab = 'join'">Join</a>
          </li>
          <li v-bind:class="{ 'is-active': tab == 'create' }"><a v-on:click="tab = 'create'">Create</a>
          </li>
        </ul>
      </div>
      <div v-show="(tab == 'join')">
        <div class="field">
          <label for="" class="label">Room ID</label>
          <div class="control">
            <input type="text" placeholder="XYEX" v-model="roomid" class="input" @keyup.enter="join()"
              @input="gametype_fetcher">
            <span class="icon is-small is-left">
              <i class="fa fa-envelope"></i>
            </span>
          </div>
        </div>
        <div class="field is-fullwi8dth column">
          <a class="button is-success is-fullwidth" v-on:click="join()">
            Join a room
          </a>
        </div>
        <div class="field is-fullwi8dth column">
          {{ game_names[game_to_join] }}
        </div>
      </div>
      <div v-show="(tab == 'create')" class="is-fullwidth column">
        <div class="field select is-fullwidth">
          <select v-model="game_to_start">
            <option value="test">Test</option>
            <option value="cadvrs">Cadavre exquis [Written]</option>
            <option value="cadvrd">Cadavre exquis [Drawn]</option>
          </select>
        </div>
        <div class="field">
          <a class="button is-success is-fullwidth" v-on:click="create()">
            Create a room
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
