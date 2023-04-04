<script lang="ts" setup>
	import { useRepositoryHttp } from '../../src/vue'
	import { computed, watch } from 'vue'

	type User = {
		id: number
		name: string
	}

	const { read, update } = useRepositoryHttp<User>('users/:id?')
	const { isLoading: isReading, error: readError, item } = read({ id: 1 })
	const {
		isLoading: isUpdating,
		error: updateError,
		execute,
	} = update(item, { id: 1 }, { immediate: false })

	const isLoading = computed(() => isReading.value || isUpdating.value)
	const error = computed(() => updateError.value || readError.value)
</script>

<template>
	<form @submit.prevent="execute()" data-test="form">
		<div v-if="isLoading" data-test="loading">Loading...</div>
		<div v-if="error" data-test="error">{{ error }}</div>
		<template v-if="item">
			<input type="text" v-model="item.name" data-test="input" />
			<button :disabled="isLoading" type="submit" data-test="button">
				Submit
			</button>
		</template>
	</form>
</template>
