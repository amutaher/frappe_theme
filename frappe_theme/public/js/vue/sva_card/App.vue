<template>
    <NumberCard 
        v-for="(item, index) in cards" 
        :card="item" 
        :key="item.card_label" 
        :delay="index * 200"
    />
</template>

<script setup>
import NumberCard from './components/NumberCard.vue';

const props = defineProps({
	cards: {
		type: Array,
		default: []
	}
});

</script>