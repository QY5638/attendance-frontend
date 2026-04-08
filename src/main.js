import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElAlert } from 'element-plus/es/components/alert/index.mjs'
import { ElButton } from 'element-plus/es/components/button/index.mjs'
import { ElCard } from 'element-plus/es/components/card/index.mjs'
import { ElCol } from 'element-plus/es/components/col/index.mjs'
import { ElAside, ElContainer, ElHeader, ElMain } from 'element-plus/es/components/container/index.mjs'
import { ElDialog } from 'element-plus/es/components/dialog/index.mjs'
import { ElEmpty } from 'element-plus/es/components/empty/index.mjs'
import { ElForm, ElFormItem } from 'element-plus/es/components/form/index.mjs'
import { ElInput } from 'element-plus/es/components/input/index.mjs'
import { ElLoadingDirective } from 'element-plus/es/components/loading/index.mjs'
import { ElMenu, ElMenuItem } from 'element-plus/es/components/menu/index.mjs'
import { ElOption, ElSelect } from 'element-plus/es/components/select/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import { ElRadio, ElRadioGroup } from 'element-plus/es/components/radio/index.mjs'
import { ElRow } from 'element-plus/es/components/row/index.mjs'
import { ElSkeleton } from 'element-plus/es/components/skeleton/index.mjs'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import { ElTag } from 'element-plus/es/components/tag/index.mjs'
import 'element-plus/es/components/alert/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/card/style/css'
import 'element-plus/es/components/col/style/css'
import 'element-plus/es/components/container/style/css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/empty/style/css'
import 'element-plus/es/components/form/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/menu/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/row/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/skeleton/style/css'
import 'element-plus/es/components/table/style/css'
import 'element-plus/es/components/tag/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './theme.css'

import App from './App.vue'
import { createAppRouter } from './router'

const app = createApp(App)
const pinia = createPinia()
const router = createAppRouter(pinia)
const elementComponents = [
  ElAlert,
  ElAside,
  ElButton,
  ElCard,
  ElCol,
  ElContainer,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElHeader,
  ElInput,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElPagination,
  ElRadio,
  ElRadioGroup,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
]

elementComponents.forEach((component) => {
  app.component(component.name, component)
})

app.directive('loading', ElLoadingDirective)

app.use(pinia)
app.use(router)
app.mount('#app')
