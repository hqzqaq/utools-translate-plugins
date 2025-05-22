<script lang="ts" setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { 
  getTranslationModes, 
  getProviders, 
  getModels, 
  translate, 
  getSavedApiKey,
  detectLanguage,
  addCustomModelConfig,
  removeCustomModelConfig,
  addCustomPrompt,
  removeCustomPrompt,
  updateCustomPrompt,
  getCustomPrompts
} from '../api/llm';

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
});

// 翻译服务和模型
const activeProvider = ref('zhipu');
const providers = ref(getProviders());
const models = ref([]);
const selectedModel = ref('');
const apiKey = ref('');

// 翻译模式
const translationModes = ref(getTranslationModes());
const selectedMode = ref('general');

// 语言设置
const sourceLanguage = ref('自动识别');
const targetLanguage = ref('简体中文');
const inputText = ref('');
const translatedText = ref('');
const loading = ref(false);
const error = ref('');
// 添加一个标记，记录用户是否手动选择了目标语言
const userSelectedTarget = ref(false);

// 字数限制
const maxLength = 200000;
const inputLength = computed(() => inputText.value.length);
const isOverLimit = computed(() => inputLength.value > maxLength);

// 监听目标语言变化，标记用户是否手动选择
watch(targetLanguage, () => {
  userSelectedTarget.value = true;
});

// 监听选项卡变化，保存当前选择的选项卡
watch(activeProvider, (newProvider) => {
  // 保存当前选择的选项卡到 uTools 数据库
  window.utools.dbStorage.setItem('last_active_provider', newProvider);
});

// 加载模型列表
const loadModels = () => {
  models.value = getModels(activeProvider.value);
  selectedModel.value = models.value.length > 0 ? models.value[0].id : '';
  
  // 加载保存的API密钥
  apiKey.value = getSavedApiKey(activeProvider.value);
  // 正确引用 props 中的 enterAction
  if (props.enterAction && props.enterAction.payload && props.enterAction.payload != "翻译") {
    inputText.value = props.enterAction.payload;
    handleTranslate();
  }
};

// 当提供商变化时重新加载模型
watch(activeProvider, loadModels);

// 初始化
onMounted(() => {
  // 从 uTools 数据库中读取上次选择的选项卡
  const lastActiveProvider = window.utools.dbStorage.getItem('last_active_provider');
  if (lastActiveProvider && providers.value.some(p => p.key === lastActiveProvider)) {
    activeProvider.value = lastActiveProvider;
  }
  
  loadModels();
});

// 翻译函数
const handleTranslate = async () => {
  if (!inputText.value) return;
  if (isOverLimit.value) {
    error.value = `输入文本超过${maxLength}字符限制`;
    return;
  }
  
  if (!apiKey.value) {
    error.value = '请输入API密钥';
    return;
  }
  
  error.value = '';
  loading.value = true;
  
  try {
    // 如果是自动识别，先检测语言
    const actualSourceLanguage = sourceLanguage.value === '自动识别' 
      ? detectLanguage(inputText.value) 
      : sourceLanguage.value;
    
    // 根据检测到的源语言自动切换目标语言，但仅当用户没有手动选择时
    if (sourceLanguage.value === '自动识别' && !userSelectedTarget.value) {
      if (actualSourceLanguage === '中文') {
        targetLanguage.value = '英语';
      } else if (actualSourceLanguage === '英语') {
        targetLanguage.value = '中文';
      }
    }
    
    const result = await translate({
      text: inputText.value,
      sourceLanguage: actualSourceLanguage,
      targetLanguage: targetLanguage.value,
      provider: activeProvider.value,
      model: selectedModel.value,
      mode: selectedMode.value,
      apiKey: apiKey.value
    });
    
    translatedText.value = result;
  } catch (err) {
    console.error('翻译出错:', err);
    error.value = err.message || '翻译失败';
  } finally {
    loading.value = false;
  }
};

// 清空文本
const clearText = () => {
  inputText.value = '';
  translatedText.value = '';
  error.value = '';
  // 重置用户选择标记
  userSelectedTarget.value = false;
};

// 复制翻译结果
const copyResult = () => {
  if (!translatedText.value) return;
  
  window.utools.copyText(translatedText.value);
  window.utools.showNotification('已复制到剪贴板');
};

// 自定义模型相关
const showCustomModelModal = ref(false);
const customModelForm = reactive({
  name: '',
  baseURL: '',
  models: [{ id: '', name: '' }]
});

// 自定义提示模板相关
const showCustomPromptModal = ref(false);
const customPromptForm = reactive({
  key: '',
  name: '',
  prompt: ''
});
const isEditingPrompt = ref(false);

// 判断当前提示模板是否为自定义
const isCustomPrompt = (key) => {
  const customPrompts = getCustomPrompts();
  return !!customPrompts[key];
};

// 添加自定义模型
const handleAddCustomModel = () => {
  if (!customModelForm.name || !customModelForm.baseURL || customModelForm.models.length === 0) {
    error.value = '请填写完整的自定义模型信息';
    return;
  }
  
  try {
    const newProviderKey = addCustomModelConfig(
      customModelForm.name,
      customModelForm.baseURL,
      customModelForm.models
    );
    
    // 重新加载提供商列表
    providers.value = getProviders();
    
    // 切换到新添加的提供商
    activeProvider.value = newProviderKey;
    
    // 重置表单
    customModelForm.name = '';
    customModelForm.baseURL = '';
    customModelForm.models = [{ id: '', name: '' }];
    
    // 关闭模态框
    showCustomModelModal.value = false;
    
    window.utools.showNotification('自定义模型添加成功');
  } catch (err) {
    error.value = `添加自定义模型失败: ${err.message}`;
  }
};

// 添加模型输入框
const addModelInput = () => {
  customModelForm.models.push({ id: '', name: '' });
};

// 删除模型输入框
const removeModelInput = (index) => {
  if (customModelForm.models.length > 1) {
    customModelForm.models.splice(index, 1);
  }
};

// 删除自定义模型
const handleRemoveCustomModel = () => {
  if (!activeProvider.value.startsWith('custom_')) {
    error.value = '只能删除自定义模型';
    return;
  }
  
  try {
    const success = removeCustomModelConfig(activeProvider.value);
    if (success) {
      // 重新加载提供商列表
      providers.value = getProviders();
      
      // 切换到默认提供商
      activeProvider.value = 'zhipu';
      
      window.utools.showNotification('自定义模型删除成功');
    } else {
      error.value = '删除自定义模型失败';
    }
  } catch (err) {
    error.value = `删除自定义模型失败: ${err.message}`;
  }
};

// 添加自定义提示模板
const handleAddCustomPrompt = () => {
  if (!customPromptForm.key || !customPromptForm.name || !customPromptForm.prompt) {
    error.value = '请填写完整的自定义提示模板信息';
    return;
  }
  
  try {
    if (isEditingPrompt.value) {
      updateCustomPrompt(
        customPromptForm.key,
        customPromptForm.name,
        customPromptForm.prompt
      );
    } else {
      addCustomPrompt(
        customPromptForm.key,
        customPromptForm.name,
        customPromptForm.prompt
      );
    }
    
    // 重新加载翻译模式列表
    translationModes.value = getTranslationModes();
    
    // 切换到新添加的翻译模式
    selectedMode.value = customPromptForm.key;
    
    // 重置表单
    customPromptForm.key = '';
    customPromptForm.name = '';
    customPromptForm.prompt = '';
    isEditingPrompt.value = false;
    
    // 关闭模态框
    showCustomPromptModal.value = false;
    
    window.utools.showNotification('自定义提示模板' + (isEditingPrompt.value ? '更新' : '添加') + '成功');
  } catch (err) {
    error.value = `自定义提示模板操作失败: ${err.message}`;
  }
};

// 编辑自定义提示模板
const handleEditCustomPrompt = (key) => {
  const customPrompts = getCustomPrompts();
  const prompt = customPrompts[key];
  if (prompt) {
    customPromptForm.key = key;
    customPromptForm.name = prompt.name;
    customPromptForm.prompt = prompt.prompt;
    isEditingPrompt.value = true;
    showCustomPromptModal.value = true;
  }
};

// 删除自定义提示模板
const handleRemoveCustomPrompt = (key) => {
  try {
    const success = removeCustomPrompt(key);
    if (success) {
      // 重新加载翻译模式列表
      translationModes.value = getTranslationModes();
      
      // 如果当前选中的是被删除的模式，则切换到默认模式
      if (selectedMode.value === key) {
        selectedMode.value = 'general';
      }
      
      window.utools.showNotification('自定义提示模板删除成功');
    } else {
      error.value = '删除自定义提示模板失败';
    }
  } catch (err) {
    error.value = `删除自定义提示模板失败: ${err.message}`;
  }
};

// 语言选项
const languageOptions = [
  { key: '自动识别', name: '自动识别' },
  { key: '中文', name: '中文' },
  { key: '英语', name: '英语' },
  { key: '日语', name: '日语' },
  { key: '韩语', name: '韩语' },
  { key: '法语', name: '法语' },
  { key: '德语', name: '德语' },
  { key: '西班牙语', name: '西班牙语' },
  { key: '俄语', name: '俄语' }
];
</script>

<template>
  <div class="translator-container">
    <!-- 顶部选项卡 -->
    <div class="translator-header">
      <a-tabs v-model:activeKey="activeProvider">
        <a-tab-pane v-for="provider in providers" :key="provider.key" :tab="provider.name" />
      </a-tabs>
    </div>
    
    <!-- 主体翻译区域 -->
    <div class="translator-body">
      <!-- 设置区域 -->
      <div class="settings-panel">
        <div class="setting-item">
          <span class="setting-label">模型:</span>
          <a-select v-model:value="selectedModel" style="width: 180px">
            <a-select-option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name }}
            </a-select-option>
          </a-select>
          <!-- 添加自定义模型按钮 -->
          <a-button type="link" @click="showCustomModelModal = true">
            <plus-outlined /> 添加模型
          </a-button>
          <!-- 删除自定义模型按钮 -->
          <a-button 
            v-if="activeProvider.startsWith('custom_')" 
            type="link" 
            danger 
            @click="handleRemoveCustomModel"
          >
            <delete-outlined /> 删除模型
          </a-button>
        </div>
        
        <div class="setting-item">
          <span class="setting-label">翻译模式:</span>
          <a-select v-model:value="selectedMode" style="width: 180px">
            <a-select-option v-for="mode in translationModes" :key="mode.key" :value="mode.key">
              {{ mode.name }}
              <a-tag v-if="isCustomPrompt(mode.key)" color="blue">自定义</a-tag>
            </a-select-option>
          </a-select>
          <!-- 添加自定义提示模板按钮 -->
          <a-button type="link" @click="showCustomPromptModal = true">
            <plus-outlined /> 添加提示
          </a-button>
          <!-- 编辑自定义提示模板按钮 -->
          <a-button 
            v-if="isCustomPrompt(selectedMode)" 
            type="link" 
            @click="handleEditCustomPrompt(selectedMode)"
          >
            <edit-outlined /> 编辑
          </a-button>
          <!-- 删除自定义提示模板按钮 -->
          <a-button 
            v-if="isCustomPrompt(selectedMode)" 
            type="link" 
            danger 
            @click="handleRemoveCustomPrompt(selectedMode)"
          >
            <delete-outlined /> 删除
          </a-button>
        </div>
        
        <div class="setting-item">
          <span class="setting-label">API密钥:</span>
          <a-input-password v-model:value="apiKey" placeholder="请输入API密钥" style="width: 300px" />
        </div>
      </div>
      
      <div class="translator-panel">
        <!-- 左侧输入区域 -->
        <div class="input-panel">
          <div class="panel-header">
            <a-select v-model:value="sourceLanguage" style="width: 120px">
              <a-select-option v-for="lang in languageOptions" :key="lang.key" :value="lang.key">
                {{ lang.name }}
              </a-select-option>
            </a-select>
            <a-button type="text" @click="clearText"><delete-outlined /></a-button>
          </div>
          
          <a-textarea
            v-model:value="inputText"
            placeholder="请输入文本内容"
            :auto-size="{ minRows: 8, maxRows: 15 }"
            :status="isOverLimit ? 'error' : ''"
          />
          
          <div class="panel-footer">
            <span class="word-count" :class="{ 'over-limit': isOverLimit }">
              {{ inputLength }} / {{ maxLength }}
            </span>
            <a-button type="primary" @click="handleTranslate" :loading="loading" :disabled="!inputText || isOverLimit">
              翻译
            </a-button>
          </div>
        </div>
        
        <!-- 右侧结果区域 -->
        <div class="output-panel">
          <div class="panel-header">
            <a-select v-model:value="targetLanguage" style="width: 120px">
              <a-select-option v-for="lang in languageOptions.filter(l => l.key !== '自动识别')" :key="lang.key" :value="lang.key">
                {{ lang.name }}
              </a-select-option>
            </a-select>
            <!-- 更明显的复制按钮 -->
            <a-button
              type="primary"
              style="margin-left: 12px; font-weight: 600; letter-spacing: 1px;"
              :disabled="!translatedText"
              @click="copyResult"
            >
              复制
            </a-button>
          </div>
          <div class="translated-text">
            <a-spin :spinning="loading">
              <div v-if="error" class="error-message">{{ error }}</div>
              <div v-else-if="translatedText">{{ translatedText }}</div>
              <div v-else class="placeholder">译文</div>
            </a-spin>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 自定义模型模态框 -->
    <a-modal
      v-model:visible="showCustomModelModal"
      title="添加自定义模型"
      @ok="handleAddCustomModel"
      okText="添加"
      cancelText="取消"
    >
      <a-form layout="vertical">
        <a-form-item label="名称">
          <a-input v-model:value="customModelForm.name" placeholder="请输入模型名称" />
        </a-form-item>
        <a-form-item label="API基础URL">
          <a-input v-model:value="customModelForm.baseURL" placeholder="请输入API基础URL" />
        </a-form-item>
        <a-form-item label="模型列表">
          <div v-for="(model, index) in customModelForm.models" :key="index" style="display: flex; margin-bottom: 8px;">
            <a-input v-model:value="model.id" placeholder="模型ID" style="margin-right: 8px;" />
            <a-input v-model:value="model.name" placeholder="模型显示名称" style="margin-right: 8px;" />
            <a-button type="text" danger @click="removeModelInput(index)" :disabled="customModelForm.models.length <= 1">
              <delete-outlined />
            </a-button>
          </div>
          <a-button type="dashed" block @click="addModelInput">
            <plus-outlined /> 添加模型
          </a-button>
        </a-form-item>
      </a-form>
    </a-modal>
    
    <!-- 自定义提示模板模态框 -->
    <a-modal
      v-model:visible="showCustomPromptModal"
      :title="isEditingPrompt ? '编辑自定义提示模板' : '添加自定义提示模板'"
      @ok="handleAddCustomPrompt"
      :okText="isEditingPrompt ? '更新' : '添加'"
      cancelText="取消"
    >
      <a-form layout="vertical">
        <a-form-item label="键名">
          <a-input v-model:value="customPromptForm.key" placeholder="请输入键名（英文字母和数字）" :disabled="isEditingPrompt" />
        </a-form-item>
        <a-form-item label="显示名称">
          <a-input v-model:value="customPromptForm.name" placeholder="请输入显示名称" />
        </a-form-item>
        <a-form-item label="提示模板">
          <a-textarea
            v-model:value="customPromptForm.prompt"
            placeholder="请输入提示模板，使用{sourceLanguage}、{targetLanguage}和{text}作为占位符"
            :auto-size="{ minRows: 4, maxRows: 8 }"
          />
          <div style="margin-top: 8px; color: #666;">
            提示：使用{sourceLanguage}表示源语言，{targetLanguage}表示目标语言，{text}表示待翻译文本
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style>
.translator-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%);
}

.translator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1.5px solid #e0e7ff;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(24, 144, 255, 0.06);
}

:deep(.ant-tabs-nav .ant-tabs-tab-active) {
  color: #1890ff !important;
  font-weight: bold;
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 8px 8px 0 0;
  transition: background 0.3s;
}
:deep(.ant-tabs-ink-bar) {
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
}

.translator-body {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: auto;
}

.settings-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 20px 24px;
  background: linear-gradient(90deg, #e6f7ff 0%, #f0f5ff 100%);
  border-radius: 12px;
  box-shadow: 0 2px 16px 0 rgba(24, 144, 255, 0.08);
  border-left: 5px solid #1890ff;
}

.setting-label {
  font-weight: 600;
  color: #1890ff;
  letter-spacing: 0.5px;
}

.translator-panel {
  display: flex;
  flex: 1;
  gap: 24px;
}

.input-panel, .output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1.5px solid #e0e7ff;
  border-radius: 16px;
  background: #fafdff;
  box-shadow: 0 4px 24px 0 rgba(24, 144, 255, 0.04);
  transition: box-shadow 0.3s;
}

.input-panel:hover, .output-panel:hover {
  box-shadow: 0 8px 32px 0 rgba(24, 144, 255, 0.12);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1.5px solid #e0e7ff;
  background: #f0f5ff;
  border-radius: 16px 16px 0 0;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-top: 1.5px solid #e0e7ff;
  background: #f0f5ff;
  border-radius: 0 0 16px 16px;
}

.word-count {
  color: #40a9ff;
  font-size: 13px;
  font-weight: 500;
}

.over-limit {
  color: #ff4d4f;
  font-weight: bold;
}

:deep(.ant-btn-primary) {
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
  border: none;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px 0 rgba(24, 144, 255, 0.10);
  transition: background 0.3s;
}
:deep(.ant-btn-primary:hover) {
  background: linear-gradient(90deg, #1765ad 0%, #1890ff 100%);
}

.translated-text {
  flex: 1;
  padding: 20px;
  min-height: 200px;
  overflow: auto;
  line-height: 1.7;
  font-size: 16px;
  color: #222;
}

.placeholder {
  color: #bfbfbf;
  font-style: italic;
}

.error-message {
  color: #ff4d4f;
  background: #fff2f0;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #ff4d4f;
  font-weight: 500;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  background: #b2d8ff;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #1890ff;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .translator-container {
    background: linear-gradient(135deg, #232946 0%, #16161a 100%);
  }
  .translator-header {
    background: #232946;
    border-color: #303030;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
  }
  .settings-panel {
    background: linear-gradient(90deg, #232946 0%, #21213a 100%);
    border-left: 5px solid #177ddc;
    box-shadow: 0 2px 16px rgba(24, 144, 255, 0.18);
  }
  .setting-label {
    color: #40a9ff;
  }
  .input-panel, .output-panel {
    background: #232946;
    border-color: #303030;
    box-shadow: 0 2px 10px rgba(24, 144, 255, 0.18);
  }
  .panel-header, .panel-footer {
    background: #21213a;
    border-color: #303030;
  }
  .translated-text {
    color: #eaf6fb;
  }
  .placeholder {
    color: #666;
  }
  .error-message {
    background: rgba(255, 77, 79, 0.08);
  }
  ::-webkit-scrollbar-track {
    background: #232946;
  }
  ::-webkit-scrollbar-thumb {
    background: #177ddc;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #40a9ff;
  }
}
</style>
