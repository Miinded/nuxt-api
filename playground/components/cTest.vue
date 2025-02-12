<script setup lang="ts">
import type { Todo } from '../dto/todo';

const props = defineProps<{
  id: string;
}>();

const id = computed(() => props.id);
const emits = defineEmits(['close']);

//@TODO faire un useRawQuery sans auth et un avec auth

const { data, isLoading, cache } = useRawQuery<Todo>({
  key: ['todo', id],
  url: computed(() => 'https://66aa4426613eced4eba83c35.mockapi.io/overview/todo/' + toValue(id)),
  minDelay: 250,
});

const {
  post,
  put,
  remove,
  isLoading: isSaving,
} = useMutation({
  key: ['todo', id],
});

const onSave = async () => {
  await put('https://66aa4426613eced4eba83c35.mockapi.io/overview/todo/' + toValue(id), toValue(data));
  cache.invalid(['todo'], { exact: true }); // on invalid le cache parent pour forcer le refresh de toute la liste, exact ne supprime pas les enfant
  emits('close');
};
const onCreate = async () => {
  await post('https://66aa4426613eced4eba83c35.mockapi.io/overview/todo', {});
  cache.invalid(['todo'], { exact: true }); // on invalid le cache parent pour forcer le refresh de toute la liste
  emits('close');
};
const onRemove = async () => {
  await remove('https://66aa4426613eced4eba83c35.mockapi.io/overview/todo/' + toValue(id));
  cache.invalid(['todo'], { exact: true }); // on invalid le cache parent pour forcer le refresh de toute la liste
  emits('close');
};
</script>

<template>
  <div class="bg-green-200 p-4">
    <div>TODO {{ id }}</div>
    <div v-if="isLoading">Loading...</div>
    <div v-else class="space-y-2">
      <div><input v-model="data.title" type="text" /></div>
      <div><textarea v-model="data.description" type="text" /></div>
      <template v-if="!isSaving">
        <div><button type="button" :disabled="isSaving" @click="onSave">Submit</button></div>
        <div><button type="button" :disabled="isSaving" @click="onCreate">Create</button></div>
        <div><button type="button" :disabled="isSaving" @click="onRemove">Delete</button></div>
      </template>
      <template v-else> Saving... </template>
    </div>
  </div>
</template>

<style scoped></style>
