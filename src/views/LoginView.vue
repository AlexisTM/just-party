<script lang="ts">
import { defineComponent } from 'vue'
import router from '../router';

export default defineComponent({
  data() {
    return {
      tab: 'join', // ['join', 'create']
      roomid: '',
      game_selected: 'cadavre_exquis_str'
    }
  },
  methods: {
    join() {
      router.push(`/test/player/${this.roomid}`);
      console.log(this.roomid);
    },
    create() {
      router.push(`/test/host`);
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
          <div class="control has-icons-left">
            <input type="text" placeholder="XYEX" v-model="roomid" class="input" @keyup.enter="join()">
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
      </div>
      <div v-show="(tab == 'create')" class="is-fullwidth column">
        <div class="field select is-fullwidth">
          <select v-model="game_selected">
            <option value="cadavre_exquis_str">Cadavre exquis [Écris]</option>
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
