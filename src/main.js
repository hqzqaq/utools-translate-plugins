import { createApp } from 'vue'
import './main.css'
import App from './App.vue'
import Antd from 'ant-design-vue'
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined 
} from '@ant-design/icons-vue'

const app = createApp(App)
app.use(Antd)
app.component('PlusOutlined', PlusOutlined)
app.component('DeleteOutlined', DeleteOutlined)
app.component('EditOutlined', EditOutlined)
app.mount('#app')
