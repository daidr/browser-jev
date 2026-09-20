<script setup lang="ts">
import {
  BookOpen,
  ArrowUpRight,
  Headphones,
  Sandwich,
  Route,
  Gauge,
  ShieldCheck,
  History,
  FlaskConical,
  ChevronRight,
} from 'lucide-vue-next'
import { examples, type Example } from '../../lib/examples'
import type { Evaluation } from '../../lib/prompt-api'
defineProps<{ selectedTitle: string; history: Evaluation[]; disabled: boolean }>()
const emit = defineEmits<{ select: [example: Example]; history: [evaluation: Evaluation] }>()
const icons = [Headphones, Sandwich, Route, Gauge, ShieldCheck]
const time = (date: string) =>
  new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <aside class="sidebar">
    <a class="brand" href="./" aria-label="BrowserJev 首页"
      ><img src="/favicon.svg" alt="" width="29" height="29" /><span
        >BrowserJev<small>Decision playground</small></span
      ></a
    >
    <div class="nav-item">
      <FlaskConical :size="16" /><span>Playground</span><span class="local-label">Local</span>
    </div>
    <div class="sidebar-label"><BookOpen :size="13" />从一个示例开始</div>
    <div class="example-list">
      <button
        v-for="(example, i) in examples"
        :key="example.id"
        :class="['example', { active: selectedTitle === example.title }]"
        :disabled="disabled"
        @click="emit('select', example)"
      >
        <component :is="icons[i]" :size="17" class="example-icon" />
        <span class="example-copy"
          ><strong>{{ example.title }}</strong
          ><small>{{ example.description }}</small></span
        >
        <ChevronRight v-if="selectedTitle === example.title" :size="13" />
      </button>
    </div>
    <div class="sidebar-label history-heading">
      <History :size="13" />运行历史 <span>{{ history.length }}</span>
    </div>
    <p v-if="!history.length" class="history-empty">
      运行后，在这里回看结果。<br />最近 10 次记录保存在本机。
    </p>
    <div v-else class="history-list">
      <button
        v-for="item in history"
        :key="item.createdAt"
        class="history-item"
        :disabled="disabled"
        @click="emit('history', item)"
      >
        <span class="history-dot" /><span
          >{{ Object.keys(item.request.questions).length }} 个问题<small>{{
            time(item.createdAt)
          }}</small></span
        ><span class="duration">{{ (item.elapsedMs / 1000).toFixed(1) }}s</span>
      </button>
    </div>
    <div class="sidebar-bottom">
      <a href="https://docs.typesafe.ai/primitives" target="_blank" rel="noreferrer"
        ><BookOpen :size="14" />Jev 接口文档<ArrowUpRight :size="14"
      /></a>
      <p>在你的浏览器中推理。<br />无需 API Key。</p>
      <span class="version">BrowserJev <span>v0.1</span></span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 236px;
  flex-shrink: 0;
  background: #fafbfe;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 25px 15px 18px;
  overflow: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
  margin: 0 9px 35px;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.4px;
}
.brand small {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  color: var(--muted);
  font-weight: 400;
  letter-spacing: 0.1px;
}
.nav-item {
  padding: 11px 12px;
  color: var(--blue);
  background: #eaf0fe;
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
}
.local-label {
  margin-left: auto;
  font-size: 9px;
  font-weight: 400;
  background: #dfe8fd;
  padding: 2px 5px;
  border-radius: 4px;
}
.sidebar-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8691a4;
  font-size: 10px;
  margin: 31px 12px 12px;
}
.sidebar-label > span {
  margin-left: auto;
}
.example {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 12px 10px;
  margin-bottom: 4px;
  color: #647087;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 7px;
  cursor: pointer;
}
.example:hover {
  background: #f0f3fa;
}
.example.active {
  background: #fff;
  border-color: #dfe6f2;
  color: var(--blue);
  box-shadow: 0 2px 4px #1c335205;
}
.example-icon {
  flex-shrink: 0;
}
.example-copy {
  flex: 1;
  min-width: 0;
}
.example strong {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
}
.example small {
  display: block;
  font-size: 9px;
  color: #929aaa;
  margin-top: 5px;
  line-height: 1.5;
}
.history-empty {
  font-size: 10px;
  color: #949dad;
  line-height: 1.9;
  padding: 0 12px;
}
.history-item {
  display: flex;
  gap: 9px;
  align-items: center;
  background: none;
  border: 0;
  width: 100%;
  padding: 9px 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 5px;
  font-size: 10px;
  color: var(--ink);
}
.history-item:hover {
  background: #edf1f8;
}
.history-item small {
  display: block;
  font-size: 9px;
  color: var(--muted);
  margin-top: 3px;
}
.history-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #67ab9b;
}
.duration {
  margin-left: auto;
  color: var(--muted);
  font-size: 10px;
}
.sidebar-bottom {
  padding: 22px 12px 0;
  margin-top: auto;
}
.sidebar-bottom a {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #59677e;
  text-decoration: none;
  font-size: 11px;
}
.sidebar-bottom a > :last-child {
  margin-left: auto;
}
.sidebar-bottom p {
  font-size: 10px;
  color: #919aab;
  line-height: 1.9;
  margin: 21px 0;
}
.version {
  display: flex;
  justify-content: space-between;
  color: #a4abba;
  font-size: 9px;
}
@media (min-width: 1800px) {
  .sidebar {
    width: 260px;
  }
}
@media (max-width: 1100px) {
  .sidebar {
    width: 196px;
    padding-inline: 10px;
  }
  .example small {
    display: none;
  }
  .brand {
    font-size: 15px;
  }
}
@media (max-width: 800px) {
  .sidebar {
    width: 100%;
    padding: 15px;
    border-right: none;
    border-bottom: 1px solid var(--border);
    overflow: visible;
  }
  .brand {
    margin: 0 0 18px;
  }
  .nav-item,
  .sidebar-label,
  .history-empty,
  .history-list,
  .sidebar-bottom {
    display: none;
  }
  .example-list {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }
  .example {
    width: auto;
    padding: 8px;
    margin: 0;
  }
  .example-icon {
    width: 14px;
  }
}
</style>
