<template>
        <button type="button" class="btn btn-sm btn-secondary " data-toggle="dropdown">
          <svg class="icon icon-sm"><use href="#icon-dot-horizontal"></use></svg>
        </button>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="#">Export</a>
          <a class="dropdown-item" href="#">Import</a>
        </div>
</template>

<script setup>
import { ref } from 'vue';


const props = defineProps({
    frm: {
        type: Object,
        required: true
    }
});

</script>