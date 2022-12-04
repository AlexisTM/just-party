<script lang="ts">
import { defineComponent } from 'vue'
import router from '../router';
import axios from 'axios'

export default defineComponent({
  data() {
    return {
      a: 1
    }
  },
  methods: {
    ready() {
      router.push(`/login`);
    },
    service_check() {
      let url = import.meta.env.VITE_PROXY_URL as string;
      if (url == undefined) {
        url = window.location.hostname + ':8081';
      }
      let protocol = import.meta.env.VITE_PROTOCOL_HTTP as string;
      if (protocol == undefined) {
        protocol = "http";
      }
      axios.get(`${protocol}://${url}/`).then((resp) => {
        console.log("OK", resp);
        this.ready();
      }).catch(
        (error) => {
          if (error.response == undefined) {
            setTimeout(this.service_check, 500);
          } else if (error.response.status == 400) {
            this.ready();
          } else {
            setTimeout(this.service_check, 500);
          }
          console.log("Error", error.response);
        }
      )
    }
  },
  mounted() {
    this.service_check();
  }
})
</script>

<template>
  <div class="column is-5-tablet is-4-desktop is-3-widescreen">
    <div class="is-h1 title has-text-centered">
      Waiting for the game server to be ready.<br><br>
      <progress class="progress is-large is-primary" max="100"></progress>
    </div>
  </div>
</template>
