<template>
  <q-page padding>
    <div class="row q-col-gutter-lg">
      <aside class="col-12 col-md-3">
        <q-list class="bg-white" bordered separator>
          <q-item v-for="item in docs" :key="item.key" clickable active-class="bg-primary text-white">
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-list>
      </aside>
      <section class="col-12 col-md-9">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h5 text-weight-bold">{{ currentDoc.label }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">{{ currentDoc.fileName }}</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="markdown-preview" />
          </q-card-section>
        </q-card>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'

// TODO: 문서 목록 데이터가 아직 정의되지 않음 (.src/pages/IntroDocPage.json도 비어있음) — 채워 넣어야 함
const docs = ref([])
const currentDoc = computed(() => docs.value[0] || {})
</script>
