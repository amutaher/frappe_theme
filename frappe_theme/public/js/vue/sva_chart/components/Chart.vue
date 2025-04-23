<template>
	<transition name="fade">
		<div v-if="showChart">
			<Skeleton v-if="loading" />
			<div v-else class="card mb-2" style="padding: 8px 8px 8px 12px;">
				<div class="d-flex justify-content-between align-items-center">
					{{ chart.details.chart_name }}
					<div class="dropdown" v-if="actions.length">
						<span title="action" class="pointer d-flex justify-content-center align-items-center" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							...
						</span>
						<div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
							<a v-for="action in actions" 
								:key="action.action" 
								class="dropdown-item" 
								@click="handleAction(action.action)">
								{{ action.label }}
							</a>
						</div>
					</div>
				</div>
				<Bar v-if="chart?.details?.type === 'Bar'" :data="data" :options="options" />
				<Line v-if="chart?.details?.type === 'Line'" :data="data" :options="options" />
				<Pie v-if="chart?.details?.type === 'Pie'" :data="data" :options="options" />
				<Doughnut v-if="chart?.details?.type === 'Donut'" :data="data" :options="options" />

			</div>
		</div>
	</transition>
</template>
<!-- Used as Button & Heading Control -->
<script setup>
import Skeleton from './Skeleton.vue';
import { ref, onMounted, inject } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar ,Line,Pie,Doughnut} from 'vue-chartjs'

// Register ChartJS components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
)

const loading = ref(true);
const count = ref(0);
const showChart = ref(false);
const data = ref({
	labels: ['January', 'February', 'March'],
	datasets: [{ data: [40, 20, 12] }]
});
const options = ref({
	responsive: true
});

const props = defineProps({
	chart: {
		type: Object,
		default: {}
	},
	delay: {
		type: Number,
		default: 0
	},
	actions: {
		type: Array,
		default: () => [
			{ label: "Refresh", action: "refresh" }
		]
	}
});

// const emit = defineEmits(['action-clicked']);

const handleAction = async (action) => {
	loading.value = true;
	await getCount();
	// emit('action-clicked', action);
};

const getCount = async () => {
	let type = 'Report';
	let details = {};
	if(props.chart.report) {
		type = 'Report';
		details = props.chart.details;
	}else{
		type = 'Document Type';
		details = props.chart.details;
	}
	try {
		loading.value = true;
		let res = await frappe.call({
			method: 'frappe_theme.dt_api.get_chart_count',
			args: {
				type: type,
				details: details,
				doctype: cur_frm.doc.doctype,
				docname:cur_frm.doc.name
			}
		})
		if(res.message){
			count.value = res.message.count;
			setTimeout(() => {
				loading.value = false;
			}, 500);
		}
	} catch (error) {
		console.error(error);
		loading.value = false;
	}
}

onMounted(async () => {
	// Initial delay based on card position
	setTimeout(async () => {
		showChart.value = true;
		await getCount();
	}, props.delay);
})
</script>
<style lang="scss" scoped>
h4 {
	margin-bottom: 0px;
}

.pointer {
	cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
