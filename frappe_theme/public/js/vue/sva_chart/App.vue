<template>
    <Chart 
        v-for="(item, index) in charts" 
        :chart="item" 
        :key="item.chart_label" 
        :delay="index * 200"
    />
</template>

<script setup>
import Chart from './components/Chart.vue';

const props = defineProps({
	charts: {
		type: Array,
		default: []
	}
});
</script>