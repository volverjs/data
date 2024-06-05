<script lang="ts" setup>
	import { computed, type Ref } from 'vue'
	import { useRepositoryHttp } from '../../src/vue'

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
	} = update(item as Ref<User>, { id: 1 }, { immediate: false })

	const isLoading = computed(() => isReading.value || isUpdating.value)
	const error = computed(() => updateError.value || readError.value)
</script>

<template>
	<form data-test="form" @submit.prevent="execute()">
		<div v-if="isLoading" data-test="loading">Loading...</div>
		<div v-if="error" data-test="error">{{ error }}</div>
		<template v-if="item">
			<input v-model="item.name" type="text" data-test="input" />
			<button :disabled="isLoading" type="submit" data-test="button">
				Submit
			</button>
		</template>
	</form>
</template>
