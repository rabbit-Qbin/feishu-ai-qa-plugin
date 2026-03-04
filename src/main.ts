import { workspace, dashboard } from '@lark-base-open/js-sdk';
import './style.css';

// 常量定义
const FIELD_NAMES = {
  asin: 'ASIN',
  title: '商品标题',
  monthlySales: '月销量',
  monthlySalesGrowth: '月销量增长率',
  monthlyRevenue: '月销售额',
  smallClassBSR: '小类BSR',
  largeClassBSR: '大类BSR',
  largeClassBSRGrowth: '大类BSR增长率',
  ratings: '评分数',
  sellers: '卖家数',
  listingDays: '上架天数',
  lqs: 'LQS',
  profitMargin: '毛利率',
  fba: 'FBA ($)',
  demand: '需求趋势得分',
  competition: '竞争强度得分',
  profit: '利润空间得分',
  comprehensive: '综合得分',
  category: '初步产品分类',
  finalCategory: '最终产品分类',
  conclusion: '选品结论',
  priority: '优先级',
  aiAnalysis: 'AI 选品解读'
};

// 🔥 所有字段列表（用于全量数据抓取）
const ALL_FIELDS = Object.values(FIELD_NAMES);

// Moonshot (Kimi) API 默认配置（可被 customConfig 覆盖）
const MOONSHOT_API_KEY = '';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MOONSHOT_MODEL = 'moonshot-v1-8k';

// 当前使用的大模型配置（View 状态下从 customConfig 读取）
let currentApiConfig: { apiUrl: string; apiKey: string; model: string } = {
  apiUrl: MOONSHOT_API_URL,
  apiKey: MOONSHOT_API_KEY,
  model: MOONSHOT_MODEL
};

// 目标表名
const TARGET_TABLE_NAME = '选品结果';

// 主初始化函数（按照官方文档要求）
async function init() {
  const app = document.getElementById('app')!;
  
  try {
    if (!dashboard) {
      throw new Error('dashboard 对象不存在，请确认在应用插件环境中运行');
    }
    
    const state = dashboard.state;
    console.log('📊 当前状态:', state);
    
    if (state === 'Create' || state === 'Config') {
      await renderCreateConfigState(app);
    } else if (state === 'View') {
      await renderViewState(app);
    }
    
  } catch (error: any) {
    console.error('插件初始化失败:', error);
    app.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #de350b;">插件初始化失败</h2>
        <p style="color: #5e6c84;">${error?.message || error}</p>
      </div>
    `;
  }
}

// Create/Config 状态：显示配置界面（自动查找"选品结果"表）
async function renderCreateConfigState(app: HTMLElement) {
  app.innerHTML = `
    <div style="display: flex; flex: 1; min-height: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <!-- 左侧预览区 -->
      <div style="flex: 1; padding: 24px; overflow: auto; background: #fafbfc;">
        <div id="preview-area" style="background: white; border-radius: 8px; padding: 20px; min-height: 400px;">
          <div id="status" style="padding: 12px; background: #f4f5f7; border-radius: 4px; color: #5e6c84; font-size: 13px; margin-bottom: 16px;">
            ⏳ 正在自动查找"选品结果"表...
          </div>
          <div id="qa-preview"></div>
        </div>
      </div>
      
      <!-- 右侧配置区（固定340px，底部预留70px） -->
      <div style="width: 340px; background: white; border-left: 1px solid #dfe1e6; padding: 24px; overflow-y: auto; padding-bottom: 70px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #172b4d;">配置信息</h3>
        
        <div style="margin-bottom: 20px; padding: 12px; background: #f4f5f7; border-radius: 4px;">
          <div style="font-size: 13px; color: #5e6c84; margin-bottom: 8px;">数据表</div>
          <div id="table-info" style="font-size: 14px; color: #172b4d; font-weight: 500;">正在查找...</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #4a5568; margin-bottom: 6px;">API 地址 (URL)</label>
          <input id="config-api-url" type="text" placeholder="https://api.moonshot.cn/v1/chat/completions" style="width: 100%; padding: 8px 12px; border: 1px solid #dfe1e6; border-radius: 6px; font-size: 13px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #4a5568; margin-bottom: 6px;">API Key</label>
          <input id="config-api-key" type="password" placeholder="sk-xxx" style="width: 100%; padding: 8px 12px; border: 1px solid #dfe1e6; border-radius: 6px; font-size: 13px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #4a5568; margin-bottom: 6px;">模型名称</label>
          <input id="config-model" type="text" placeholder="moonshot-v1-8k" style="width: 100%; padding: 8px 12px; border: 1px solid #dfe1e6; border-radius: 6px; font-size: 13px; box-sizing: border-box;" title="兼容 OpenAI 的模型名，如 moonshot-v1-8k、gpt-4 等" />
        </div>
        
        <!-- 确定按钮（固定在底部） -->
        <button id="save-btn" style="position: fixed; bottom: 0; right: 0; width: 340px; padding: 16px; font-size: 14px; font-weight: 600; background: #0052cc; color: white; border: none; cursor: pointer; disabled: true;">
          确定
        </button>
      </div>
    </div>
  `;
  
  // 自动查找"选品结果"表
  await autoFindTable();
  
  // 预填大模型配置（若有已保存的）
  try {
    const config: any = await dashboard.getConfig();
    const cc = config?.customConfig || {};
    const urlInput = document.getElementById('config-api-url') as HTMLInputElement;
    const keyInput = document.getElementById('config-api-key') as HTMLInputElement;
    const modelInput = document.getElementById('config-model') as HTMLInputElement;
    if (urlInput && cc.apiUrl) urlInput.value = cc.apiUrl;
    if (keyInput && cc.apiKey) keyInput.value = cc.apiKey;
    if (modelInput && cc.model) modelInput.value = cc.model;
  } catch (_) {}
  
  // 绑定保存按钮
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  saveBtn.addEventListener('click', async () => {
    await saveConfig();
  });
}

// 自动查找"选品结果"表
async function autoFindTable() {
  const status = document.getElementById('status')!;
  const tableInfo = document.getElementById('table-info')!;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  
  try {
    status.textContent = '⏳ 正在查找"选品结果"表...';
    
    // 获取所有多维表格
    const baseList = await workspace.getBaseList({});
    
    // 遍历所有多维表格，查找"选品结果"表
    for (const base of baseList.base_list) {
      try {
        const bitableApp = await workspace.getBitable(base.token);
        if (!bitableApp) continue;
        
        const tableList = await bitableApp.base.getTableList();
        
        for (const table of tableList) {
          const tableName = await table.getName();
          if (tableName.includes(TARGET_TABLE_NAME)) {
            // 找到目标表
            const tableInfoData = await loadTableInfoFromTable(table);
            
            status.textContent = `✅ 已找到"选品结果"表（${tableInfoData.totalCount} 条记录）`;
            status.style.background = '#e3fcef';
            status.style.color = '#006644';
            
            tableInfo.textContent = `${base.name} > ${tableName}`;
            
            // 保存找到的表信息到全局变量
            (window as any).__foundTableInfo = {
              baseToken: base.token,
              tableId: table.id,
              table: table,
              tableInfo: tableInfoData
            };
            
            // 渲染预览
            const qaPreview = document.getElementById('qa-preview')!;
            renderQAPanel(tableInfoData, qaPreview);
            
            saveBtn.disabled = false;
            return;
          }
        }
      } catch (e) {
        console.warn(`查找多维表格 ${base.name} 失败:`, e);
        continue;
      }
    }
    
    // 没找到
    status.textContent = `❌ 未找到"选品结果"表，请确保表中包含该表`;
    status.style.background = '#ffebee';
    status.style.color = '#de350b';
    tableInfo.textContent = '未找到';
    
  } catch (error: any) {
    console.error('自动查找表失败:', error);
    status.textContent = `❌ 查找失败: ${error?.message || error}`;
    status.style.background = '#ffebee';
    status.style.color = '#de350b';
    tableInfo.textContent = '查找失败';
  }
}

// View 状态：直接显示问答对话框（无弹窗），自适应拉宽/拉大
async function renderViewState(app: HTMLElement) {
  app.innerHTML = `
    <div id="view-root" style="display: flex; flex-direction: column; flex: 1; min-height: 0; width: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing: border-box;">
      <div id="status" style="flex-shrink: 0; padding: 10px 12px; background: #f4f5f7; border-radius: 4px; color: #5e6c84; font-size: 12px; margin: 12px;">
        ⏳ 正在加载数据...
      </div>
      <div id="qa-panel-container" style="flex: 1; min-height: 0; overflow: hidden; display: none; padding: 0 12px 12px; width: 100%; min-width: 0; box-sizing: border-box;"></div>
    </div>
  `;
  
  try {
    const config: any = await dashboard.getConfig();
    if (!config?.dataConditions?.[0]?.baseToken || !config?.dataConditions?.[0]?.tableId) {
      throw new Error('未找到保存的配置，请重新配置插件');
    }
    
    // 使用配置中的大模型参数（Create 状态传入的 customConfig）
    const cc = config.customConfig || {};
    currentApiConfig = {
      apiUrl: (cc.apiUrl || '').trim() || MOONSHOT_API_URL,
      apiKey: (cc.apiKey || '').trim(),
      model: (cc.model || '').trim() || MOONSHOT_MODEL
    };
    
    const baseToken = config.dataConditions[0].baseToken;
    const tableId = config.dataConditions[0].tableId;
    
    const dataResult = await dashboard.getData();
    console.log('📊 getData 返回:', dataResult);
    
    const bitableApp = await workspace.getBitable(baseToken);
    if (!bitableApp) {
      throw new Error('无法获取多维表格实例');
    }
    
    const table = await bitableApp.base.getTableById(tableId);
    const tableInfo = await loadTableInfoFromTable(table);
    
    const status = document.getElementById('status')!;
    const panelContainer = document.getElementById('qa-panel-container')!;
    const viewRoot = document.getElementById('view-root')!;
    status.style.display = 'none';
    panelContainer.style.display = 'flex';
    panelContainer.style.flexDirection = 'column';
    
    renderQAPanel(tableInfo, panelContainer);
    
    // 布局调试：在控制台打印各层高度，确认「只有中间滚动、输入框贴底」
    setTimeout(() => debugLayout(), 100);
    
    // 自适应：拉宽/拉大面板时随容器尺寸变化（与气泡图一致）
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const w = entry.contentRect.width;
        el.setAttribute('data-width', String(Math.round(w)));
      }
    });
    resizeObserver.observe(viewRoot);
    
  } catch (error: any) {
    console.error('View 状态加载失败:', error);
    const status = document.getElementById('status')!;
    status.style.display = 'block';
    status.textContent = `❌ 加载失败: ${error?.message || error}`;
    status.style.background = '#ffebee';
    status.style.color = '#de350b';
  }
}


// 保存配置（必须保存 dataConditions）
async function saveConfig() {
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const status = document.getElementById('status')!;
  
  const foundTableInfo = (window as any).__foundTableInfo;
  
  if (!foundTableInfo || !foundTableInfo.baseToken || !foundTableInfo.tableId) {
    alert('请先找到"选品结果"表');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  status.textContent = '⏳ 正在保存配置...';
  
  try {
    const apiUrlInput = document.getElementById('config-api-url') as HTMLInputElement;
    const apiKeyInput = document.getElementById('config-api-key') as HTMLInputElement;
    const modelInput = document.getElementById('config-model') as HTMLInputElement;
    const apiUrl = (apiUrlInput?.value || '').trim() || MOONSHOT_API_URL;
    const apiKey = (apiKeyInput?.value || '').trim();
    const model = (modelInput?.value || '').trim() || MOONSHOT_MODEL;
    
    // 构建 dataConditions（必须包含 baseToken 和 tableId）
    const dataConditions = [{
      baseToken: foundTableInfo.baseToken,
      tableId: foundTableInfo.tableId
    }];
    
    console.log('💾 保存 dataConditions:', JSON.stringify(dataConditions, null, 2));
    
    // 保存配置（含大模型：API 地址、API Key、模型名称）
    await dashboard.saveConfig({
      dataConditions,
      customConfig: { apiUrl, apiKey, model }
    });
    
    status.textContent = '✅ 配置已保存';
    status.style.background = '#e3fcef';
    status.style.color = '#006644';
    
    // 关闭配置弹窗（进入 View 状态）
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.textContent = '确定';
    }, 1000);
    
  } catch (error: any) {
    console.error('保存配置失败:', error);
    status.textContent = `❌ 保存失败: ${error?.message || error}`;
    status.style.background = '#ffebee';
    status.style.color = '#de350b';
    saveBtn.disabled = false;
    saveBtn.textContent = '确定';
  }
}

// 从表对象加载表信息
async function loadTableInfoFromTable(table: any): Promise<any> {
  const fieldList = await table.getFieldList();
  const fieldIds: Record<string, string> = {};
  const fieldTypes: Record<string, any> = {}; // 存储字段类型信息
  const fieldInfo: Array<{name: string, type: any, id: string}> = []; // 存储完整字段信息
  
  for (const field of fieldList) {
    const name = await field.getName();
    fieldIds[name] = field.id;
    try {
      const type = await field.getType();
      fieldTypes[name] = type;
      fieldInfo.push({ name, type, id: field.id });
    } catch (e) {
      fieldTypes[name] = null;
      fieldInfo.push({ name, type: null, id: field.id });
    }
  }
  
  // 获取统计信息（只读取少量记录）
  const sampleRecords: any[] = [];
  let pageToken: number | undefined = undefined;
  const pageSize = 200;
  let totalCount = 0;
  
  const firstPage: any = await table.getRecordListByPage({
    pageSize,
    pageToken
  });
  
  if (firstPage.records) {
    sampleRecords.push(...Array.from(firstPage.records));
    totalCount = firstPage.records.length;
  }
  
  pageToken = firstPage.hasMore ? (typeof firstPage.pageToken === 'number' ? firstPage.pageToken : parseInt(String(firstPage.pageToken))) : undefined;
  let pageCount = 1;
  
  while (pageToken && pageCount < 3) {
    const result: any = await table.getRecordListByPage({
      pageSize,
      pageToken
    });
    
    if (result.records) {
      sampleRecords.push(...Array.from(result.records));
      totalCount += result.records.length;
    }
    
    pageToken = result.hasMore ? (typeof result.pageToken === 'number' ? result.pageToken : parseInt(String(result.pageToken))) : undefined;
    pageCount++;
  }
  
  // 解析样本数据
  const sampleData: any[] = [];
  const batchSize = 50;
  
  for (let i = 0; i < Math.min(sampleRecords.length, 150); i += batchSize) {
    const batch = sampleRecords.slice(i, i + batchSize);
    const batchData = await Promise.all(
      batch.map(async (record: any) => {
        try {
          const values: any = {};
          const keyFields = [FIELD_NAMES.comprehensive, FIELD_NAMES.category, FIELD_NAMES.demand, FIELD_NAMES.competition, FIELD_NAMES.profit];
          for (const fieldName of keyFields) {
            const fieldId = fieldIds[fieldName];
            if (fieldId) {
              try {
                const cell = await record.getCellByField(fieldId);
                const value = await cell.getValue();
                values[fieldName] = extractValue(value);
              } catch (e) {
                values[fieldName] = null;
              }
            }
          }
          return values;
        } catch (e) {
          return null;
        }
      })
    );
    sampleData.push(...batchData.filter(d => d !== null));
  }
  
  const withComprehensive = sampleData.filter(item => item[FIELD_NAMES.comprehensive] != null).length;
  const avgComprehensive = sampleData
    .filter(item => item[FIELD_NAMES.comprehensive] != null)
    .reduce((sum, item) => sum + (item[FIELD_NAMES.comprehensive] || 0), 0) / withComprehensive || 0;
  
  const categories: Record<string, number> = {};
  sampleData.forEach(item => {
    const cat = item[FIELD_NAMES.category] || '其他';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  return {
    table,
    fieldIds,
    fieldTypes,
    fieldInfo, // 包含所有字段的完整信息
    totalCount,
    withComprehensiveCount: withComprehensive,
    avgComprehensive,
    categories: Object.keys(categories)
  };
}

// 提取值（参考气泡图的实现）
function extractValue(val: any): any {
  if (Array.isArray(val) && val.length > 0) return val[0];
  if (val && typeof val === 'object' && 'text' in val) return val.text;
  return val;
}

// 转换为数字（参考气泡图的实现，目前未使用但保留以备将来使用）
// @ts-ignore - 保留以备将来使用
function toNumber(_val: any): number | undefined {
  const extracted = extractValue(_val);
  if (typeof extracted === 'number') return extracted;
  if (typeof extracted === 'string') {
    const parsed = parseFloat(extracted);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

// 转换为文本（参考气泡图的实现，用于安全处理商品标题等文本字段）
function toText(val: any): string {
  // 如果已经是字符串，直接返回
  if (typeof val === 'string') return val;
  
  // 如果是 null 或 undefined，返回空字符串
  if (val === null || val === undefined) return '';
  
  // 提取值
  const extracted = extractValue(val);
  
  // 如果提取后是字符串，返回
  if (typeof extracted === 'string') return extracted;
  
  // 如果是数字，转换为字符串
  if (typeof extracted === 'number') return String(extracted);
  
  // 如果是布尔值，转换为字符串
  if (typeof extracted === 'boolean') return String(extracted);
  
  // 如果是对象且有 text 属性，返回 text（确保 text 是字符串）
  if (extracted && typeof extracted === 'object') {
    if ('text' in extracted) {
      const text = extracted.text;
      if (typeof text === 'string') return text;
      if (text === null || text === undefined) return '';
      return String(text);
    }
    // 如果是数组，取第一个元素
    if (Array.isArray(extracted) && extracted.length > 0) {
      return toText(extracted[0]);
    }
  }
  
  // 其他情况，强制转换为字符串
  try {
    return String(extracted || '');
  } catch (e) {
    return '';
  }
}

// 渲染问答面板（纯 flex 布局：输入条 flex-shrink:0 固定在底部，不依赖绝对定位，避免 iframe/不同分辨率下错位）
function renderQAPanel(tableInfo: any, container: HTMLElement) {
  container.innerHTML = `
    <div class="qa-layout-root" style="display: flex; flex-direction: column; height: 100%; min-height: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <h1 style="flex-shrink: 0; color: #172b4d; margin: 0 0 6px 0; font-size: 18px; font-weight: 600; text-align: center;">AI 选品算命</h1>
      <div class="qa-scroll-wrapper" style="flex: 1; min-height: 0; position: relative; overflow: hidden; background: white; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
        <div class="qa-scroll" style="height: 100%; overflow-y: auto; padding: 12px;">
          <div id="qa-history" style="background: #fafbfc; border-radius: 4px; padding: 10px;">
            <div style="color: #5e6c84; font-size: 12px; text-align: center; padding: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              已连接选品结果表，AI 将根据问题动态读取数据
            </div>
          </div>
        </div>
      </div>
      <div class="qa-input-bar" style="flex-shrink: 0; display: flex; gap: 6px; padding: 12px; background: white; border-top: 1px solid #e2e8f0; border-radius: 0 0 6px 6px;">
        <textarea 
          id="question-input" 
          placeholder="输入问题，如：推荐综合得分最高的10个产品"
          style="flex: 1; padding: 8px 10px; border: 1px solid #dfe1e6; border-radius: 4px; font-size: 12px; resize: none; min-height: 44px; font-family: inherit; background: #fff;"
        ></textarea>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button 
            id="ask-btn" 
            style="padding: 6px 16px; border: none; background: #0052cc; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;"
          >
            提问
          </button>
          <button 
            id="clear-btn" 
            style="padding: 6px 16px; border: 1px solid #dfe1e6; background: white; color: #5e6c84; border-radius: 4px; cursor: pointer; font-size: 12px;"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 绑定事件
  const questionInput = document.getElementById('question-input') as HTMLTextAreaElement;
  const askBtn = document.getElementById('ask-btn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const historyDiv = document.getElementById('qa-history')!;
  
  // 支持拖拽文本到输入框
  questionInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 添加视觉反馈
    questionInput.style.borderColor = '#0052cc';
    questionInput.style.background = '#f0f7ff';
  });
  
  questionInput.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 恢复原样
    questionInput.style.borderColor = '#dfe1e6';
    questionInput.style.background = 'white';
  });
  
  questionInput.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 恢复原样
    questionInput.style.borderColor = '#dfe1e6';
    questionInput.style.background = 'white';
    
    // 获取拖拽的文本
    const text = e.dataTransfer?.getData('text/plain');
    if (text) {
      // 如果输入框已有内容，追加到后面
      if (questionInput.value.trim()) {
        questionInput.value += '\n' + text;
      } else {
        questionInput.value = text;
      }
      
      console.log('🎯 拖拽文本已添加:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      
      // 自动识别 ASIN
      const asinMatch = text.match(/\b(B[A-Z0-9]{9})\b/gi);
      if (asinMatch && asinMatch.length > 0) {
        console.log('🔍 识别到 ASIN:', asinMatch.join(', '));
      }
      
      // 聚焦到输入框末尾
      questionInput.focus();
      questionInput.setSelectionRange(questionInput.value.length, questionInput.value.length);
    }
  });
  
  askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    if (!question) {
      alert('请输入问题');
      return;
    }
    await askAI(question, tableInfo, historyDiv);
  });
  
  questionInput.addEventListener('keydown', async (e) => {
    // 按 Enter 直接发送（不按 Shift 时，Shift+Enter 换行）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const question = questionInput.value.trim();
      if (question) {
        await askAI(question, tableInfo, historyDiv);
      }
    }
  });
  
  // 支持粘贴事件，自动识别 ASIN 等数据
  questionInput.addEventListener('paste', async () => {
    // 让粘贴自然发生
    setTimeout(() => {
      const pastedText = questionInput.value;
      console.log('📋 检测到粘贴内容:', pastedText);
      
      // 自动识别 ASIN 格式（B开头的10位字符）
      const asinMatch = pastedText.match(/\b(B[A-Z0-9]{9})\b/i);
      if (asinMatch) {
        console.log('🔍 识别到 ASIN:', asinMatch[1]);
        // 可以在这里添加自动提示或格式化
      }
    }, 10);
  });
  
  clearBtn.addEventListener('click', () => {
    questionInput.value = '';
    historyDiv.innerHTML = `
      <div style="color: #5e6c84; font-size: 12px; text-align: center; padding: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        已连接选品结果表，AI 将根据问题动态读取数据
      </div>
    `;
  });
}

// 全局变量：用于中断请求
let currentAbortController: AbortController | null = null;
let isAsking = false;

// 规则快速判断：根据关键词粗分「需要查数据」与否，命中则跳过一轮 LLM 意图识别，加速常见问题
function quickInferIntent(question: string): { needData: boolean; reason: string } | null {
  const q = question.toLowerCase();
  // 典型「问规则/阈值/分类原因」→ 通常不需要查数据，只解释逻辑
  const ruleKeywords = ['规则', '打分', '怎么算', '阈值', '中轴', '四象限', '为什么是', '为什么是畅销爆品', '分类逻辑'];
  if (ruleKeywords.some(k => question.includes(k))) {
    return {
      needData: false,
      reason: '命中规则/阈值/分类解释类问题，直接用知识库回答即可'
    };
  }
  // 典型「推荐/排序/前N/综合得分/销量/利润」→ 必须查数据
  const dataKeywords = [
    'top', '前', '推荐', '综合得分', '需求趋势', '竞争强度', '利润空间', '销量',
    'bsr', '毛利', 'fba', 'asin', '产品', '哪个最好', '挑几个', '选几个', '优先级'
  ];
  if (dataKeywords.some(k => q.includes(k))) {
    return {
      needData: true,
      reason: '命中推荐/排序/评估类关键词，需要查询数据'
    };
  }
  return null;
}

// 调用 AI API
async function askAI(question: string, tableInfo: any, historyDiv: HTMLElement) {
  const askBtn = document.getElementById('ask-btn') as HTMLButtonElement;
  const questionInput = document.getElementById('question-input') as HTMLTextAreaElement;
  
  // 如果正在执行，先中断
  if (isAsking && currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    isAsking = false;
    askBtn.disabled = false;
    askBtn.textContent = '提问';
    updateMessage(historyDiv, `answer-${Date.now()}`, '❌ 已中断');
    return;
  }
  
  // 创建新的 AbortController
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;
  isAsking = true;
  
  askBtn.disabled = false; // 允许点击中断
  askBtn.textContent = '中断';
  askBtn.style.background = '#de350b'; // 红色表示可以中断
  
  addMessageToHistory(historyDiv, 'user', question);
  
  const answerId = `answer-${Date.now()}`;
  addMessageToHistory(historyDiv, 'ai', '正在分析问题...', answerId);
  
  try {
    // 检查是否被中断
    if (signal.aborted) {
      updateMessage(historyDiv, answerId, '❌ 已中断');
      return;
    }
    
    // 第一步：意图识别，判断是否需要查询数据
    updateMessage(historyDiv, answerId, '🤖 正在分析问题意图...');
    const tIntentStart = Date.now();
    let intent = quickInferIntent(question);
    if (intent) {
      console.log('📚 规则意图识别命中:', intent);
    } else {
      intent = await analyzeIntent(question, tableInfo, signal);
    }
    console.log('⏱ 意图识别耗时(ms):', Date.now() - tIntentStart);

    if (signal.aborted) {
      updateMessage(historyDiv, answerId, '❌ 已中断');
      return;
    }
    console.log('📋 意图识别结果:', intent);

    if (!intent.needData) {
      updateMessage(historyDiv, answerId, '💡 正在生成回复...');
      const answer = await generateDirectAnswer(question, tableInfo, signal);
      if (signal.aborted) {
        updateMessage(historyDiv, answerId, '❌ 已中断');
        return;
      }
      updateMessage(historyDiv, answerId, answer);
      questionInput.value = '';
      return;
    }

    // 需要查询数据，执行查询计划
    updateMessage(historyDiv, answerId, '📊 正在分析查询计划...');
    const tPlanStart = Date.now();
    const queryPlan = await analyzeQuestionAndPlanQuery(question, tableInfo, signal);
    console.log('⏱ 查询计划耗时(ms):', Date.now() - tPlanStart);
    if (signal.aborted) {
      updateMessage(historyDiv, answerId, '❌ 已中断');
      return;
    }
    console.log('📋 AI 查询计划:', queryPlan);

    updateMessage(historyDiv, answerId, '📊 正在获取数据...');
    const tFetchStart = Date.now();
    const queryData = await executeQueryPlan(queryPlan, tableInfo);
    console.log('⏱ 拉取数据耗时(ms):', Date.now() - tFetchStart);
    
    // 检查是否被中断
    if (signal.aborted) {
      updateMessage(historyDiv, answerId, '❌ 已中断');
      return;
    }
    
    console.log(`✅ 查询完成，获取 ${queryData.length} 条数据`);
    
    updateMessage(historyDiv, answerId, '💡 正在基于数据生成分析...');
    const tAnswerStart = Date.now();
    const answer = await generateAnswer(question, queryData, signal);
    console.log('⏱ 生成回答耗时(ms):', Date.now() - tAnswerStart);
    
    // 检查是否被中断
    if (signal.aborted) {
      updateMessage(historyDiv, answerId, '❌ 已中断');
      return;
    }
    
    updateMessage(historyDiv, answerId, answer);
    questionInput.value = '';
    
  } catch (error: any) {
    console.error('AI 问答失败:', error);
    updateMessage(historyDiv, answerId, `❌ 错误: ${error?.message || 'AI 服务暂时不可用，请稍后重试'}`);
  } finally {
    askBtn.disabled = false;
    askBtn.textContent = '提问';
  }
}

// 意图识别：判断是否需要查询数据
async function analyzeIntent(question: string, tableInfo: any, signal?: AbortSignal): Promise<{ needData: boolean; reason: string }> {
  const fieldInfoStr = tableInfo.fieldInfo?.map((f: any) => `- ${f.name} (类型: ${f.type || '未知'})`).join('\n') || '字段信息加载中...';

  const prompt = `你是一个专业的亚马逊选品分析师助手。你的职责是帮助用户分析"选品结果表"的数据。

【可用数据】
表名：选品结果表
总记录数：${tableInfo.totalCount}
可用字段：
${fieldInfoStr}

【用户问题】
${question}

【任务】
仔细分析用户的问题，判断是否需要查询具体的数据记录来回答。

**不需要查询数据（needData: false）**：打招呼、问功能、问概念、问方法、闲聊。
**需要查询数据（needData: true）**：要求推荐/分析/统计/对比、询问具体数值或哪些产品。

**返回格式**：只返回一个 JSON 对象。
{"needData": false, "reason": "用户打招呼，不需要查询数据"}
或
{"needData": true, "reason": "用户要求推荐产品，需要查询数据"}

只返回 JSON，不要其他文字。`;

  const response = await callMoonshotAPI(prompt, signal);
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    const intent = JSON.parse(jsonStr);
    return {
      needData: intent.needData === true,
      reason: intent.reason || '需要查询数据'
    };
  } catch (e) {
    console.warn('解析意图识别失败，默认需要查询数据:', e);
    return { needData: true, reason: '解析失败，默认查询数据' };
  }
}

// 直接回答（不需要查询数据）
async function generateDirectAnswer(question: string, tableInfo: any, signal?: AbortSignal): Promise<string> {
  const fieldInfoStr = tableInfo.fieldInfo?.map((f: any) => `- ${f.name} (类型: ${f.type || '未知'})`).join('\n') || '';
  
  const prompt = `你是一个专业的亚马逊选品分析师，擅长基于多维表格数据进行产品选品分析和市场洞察。
  
【数据来源】
你需要分析的数据来自选品结果表，该表包含以下关键字段：
${fieldInfoStr}
  
【你的职责】
你是专门帮助用户分析"选品结果表"数据的AI助手。你的核心功能是基于实际数据进行分析和推荐。
  
【分析原则】
1. **如果用户打招呼**：友好回应，并简要介绍你的功能，引导用户提问关于选品数据的问题
2. **如果询问功能**：说明你可以基于选品数据进行分析和推荐，给出具体示例
3. **如果询问概念**：专业地解释相关术语，并说明这些指标在选品分析中的作用
4. **如果问题与选品无关**：礼貌地提醒用户这是选品分析场景，引导用户回到选品相关的问题
5. 回答要简洁明了，重点突出，控制在200字以内
  
【用户问题】
${question}
  
【输出要求】
- 直接输出回答，不需要额外的格式说明
- **重要**：如果用户的问题与选品分析无关（如：天气、闲聊、其他业务），请礼貌地提醒："我是专门帮助用户分析选品数据的AI助手。我可以帮用户分析选品结果表中的数据，例如：推荐综合得分最高的产品、分析不同分类的产品特点、对比产品的各项指标等。请告诉用户想了解选品数据的哪些方面？"
- 如果用户询问功能，可以提示："我可以帮用户分析选品数据，例如：推荐综合得分最高的产品、分析不同分类的产品特点、统计各类产品的数量、对比产品的各项指标等。请告诉用户想了解什么？"`;
  
  return await callMoonshotAPI(prompt, signal);
}

// 第二阶段：分析问题并制定查询计划
async function analyzeQuestionAndPlanQuery(question: string, tableInfo: any, signal?: AbortSignal): Promise<any> {
  const fieldInfoStr = tableInfo.fieldInfo?.map((f: any) => `- ${f.name} (类型: ${f.type || '未知'})`).join('\n') || '';
  
  const prompt = `你是一个数据查询规划助手。用户想要分析"选品结果表"的数据。

【表结构信息】
表名：选品结果表
可用字段（包含类型）：
${fieldInfoStr}

【数据统计】
- 总记录数：${tableInfo.totalCount}
- 有综合得分的记录：${tableInfo.withComprehensiveCount}
- 平均综合得分：${tableInfo.avgComprehensive.toFixed(2)}
- 产品分类：${tableInfo.categories.join(', ')}

【用户问题】
${question}

【任务】
请分析用户的问题，决定需要查询哪些数据。返回一个 JSON 对象，格式如下：
{
  "description": "查询计划的简短描述",
  "sortField": "排序字段名（如：综合得分、需求趋势得分等）",
  "sortOrder": "asc 或 desc",
  "limit": 需要查询的记录数量,
  "filterCategory": "筛选的产品分类（如：畅销爆品、稳健产品等，如果不需要筛选则为null）",
  "minScore": {"field": "字段名", "value": 最小值} 或 null,
  "maxScore": {"field": "字段名", "value": 最大值} 或 null
}

**重要规则**：
1. **limit 根据用户意图决定**：
   - 用户问"Top10"、"前10名" → limit=10
   - 用户问"推荐产品"、"好的产品" → limit=20-30
   - 用户问"分析整体"、"所有产品" → limit=200
2. **系统会自动获取所有字段**（ASIN、商品标题、月销量、月销量增长率、月销售额、小类BSR、大类BSR、评分数、卖家数、上架天数、LQS、毛利率、FBA费用、四维度得分等），你不需要指定字段
3. 只有当用户明确要求筛选某个分类时，才设置 filterCategory

只返回 JSON 对象，不要其他文字。`;

  const response = await callMoonshotAPI(prompt, signal);
  
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    const plan = JSON.parse(jsonStr);
    
    const finalPlan = {
      description: plan.description || '查询数据',
      sortField: plan.sortField || '综合得分',
      sortOrder: plan.sortOrder || 'desc',
      limit: plan.limit || 20,
      filterCategory: plan.filterCategory || null,
      minScore: plan.minScore || null,
      maxScore: plan.maxScore || null
    };
    
    console.log('📋 AI 查询计划:', finalPlan);
    console.log(`📊 将获取 ${finalPlan.limit} 条数据，包含所有详细字段`);
    
    return finalPlan;
  } catch (e) {
    console.warn('解析查询计划失败，使用默认计划:', e);
    return {
      description: '默认查询',
      sortField: '综合得分',
      sortOrder: 'desc',
      limit: 20,
      filterCategory: null,
      minScore: null,
      maxScore: null
    };
  }
}

// 第二阶段：执行查询计划
async function executeQueryPlan(plan: any, tableInfo: any): Promise<any[]> {
  const { table, fieldIds } = tableInfo;
  
  console.log(`🎯 查询策略: 获取 ${plan.limit} 条数据的所有详细字段`);
  
  // 获取记录
  const allRecords: any[] = [];
  let pageToken: number | undefined = undefined;
  const pageSize = 200;
  
  do {
    const result: any = await table.getRecordListByPage({
      pageSize,
      pageToken
    });
    
    if (result.records) {
      allRecords.push(...Array.from(result.records));
    }
    
    pageToken = result.hasMore ? (typeof result.pageToken === 'number' ? result.pageToken : parseInt(String(result.pageToken))) : undefined;
  } while (pageToken && allRecords.length < Math.max(plan.limit * 2, 500)); // 多抓一些用于排序
  
  console.log(`📋 获取 ${allRecords.length} 条记录，开始处理...`);
  
  // 🔥 强制使用所有字段，确保完整的专业分析
  const allFieldNames = ALL_FIELDS;
  console.log(`📊 将提取 ${allFieldNames.length} 个字段: ${allFieldNames.slice(0, 5).join(', ')}...`);
  
  const data: any[] = [];
  const batchSize = 50;
  
  for (let i = 0; i < allRecords.length && data.length < plan.limit * 1.5; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    const batchData = await Promise.all(
      batch.map(async (record: any) => {
        try {
          const values: any = {};
          for (const fieldName of allFieldNames) {
            const fieldId = fieldIds[fieldName];
            if (fieldId) {
              try {
                const cell = await record.getCellByField(fieldId);
                const value = await cell.getValue();
                // 对于商品标题字段，使用 toText 安全处理
                if (fieldName === '商品标题' || fieldName === FIELD_NAMES.title) {
                  values[fieldName] = toText(value) || 'N/A';
                } else {
                  values[fieldName] = extractValue(value);
                }
              } catch (e) {
                values[fieldName] = null;
              }
            }
          }
          return values;
        } catch (e) {
          return null;
        }
      })
    );
    data.push(...batchData.filter(d => d !== null));
  }
  
  let filteredData = data;
  
  if (plan.filterCategory) {
    filteredData = filteredData.filter(item => 
      (item['初步产品分类'] || item['最终产品分类']) === plan.filterCategory
    );
  }
  
  if (plan.minScore) {
    const fieldName = plan.minScore.field;
    filteredData = filteredData.filter(item => {
      const value = item[fieldName];
      return value != null && value >= plan.minScore.value;
    });
  }
  
  if (plan.maxScore) {
    const fieldName = plan.maxScore.field;
    filteredData = filteredData.filter(item => {
      const value = item[fieldName];
      return value != null && value <= plan.maxScore.value;
    });
  }
  
  if (plan.sortField) {
    const fieldName = plan.sortField;
    filteredData.sort((a, b) => {
      const aVal = a[fieldName] || 0;
      const bVal = b[fieldName] || 0;
      return plan.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  
  if (plan.limit) {
    filteredData = filteredData.slice(0, plan.limit);
  }
  
  console.log(`✅ 查询完成，获取 ${filteredData.length} 条数据`);
  
  // 🔥 调试：打印前 3 条数据的关键字段
  if (filteredData.length > 0) {
    console.log('📊 数据示例（前3条）:');
    filteredData.slice(0, 3).forEach((item, idx) => {
      console.log(`  [${idx + 1}] ASIN: ${item['ASIN']}, 商品标题: ${item['商品标题']}, 需求: ${item['需求趋势得分']}, 竞争: ${item['竞争强度得分']}, 利润: ${item['利润空间得分']}, 综合: ${item['综合得分']}`);
    });
  }
  
  return filteredData;
}

// 第三阶段：生成回答
const IGNORE_KEYS_FOR_AI = new Set([
  'AI 选品解读',
  'AI 选品建议',
  'AI 选品分析'
]);

async function generateAnswer(question: string, queryData: any[], signal?: AbortSignal): Promise<string> {
  console.log(`🤖 准备生成回答，输入数据量: ${queryData.length}`);
  
  // 🔥 传递给 AI 的字段做轻量过滤：去掉长文本 AI 字段，减少 token 数量，加快生成
  const dataForAI = queryData.map(item => {
    // 确保关键字段不为 null/undefined，同时过滤掉不必要的大字段
    const result: any = {};
    Object.entries(item).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (IGNORE_KEYS_FOR_AI.has(key)) return;
      result[key] = value;
    });
    return result;
  });
  
  // 🔥 调试：打印传给 AI 的数据示例
  if (dataForAI.length > 0) {
    console.log('📊 传给 AI 的数据示例（前2条）:');
    dataForAI.slice(0, 2).forEach((item, idx) => {
      const keys = Object.keys(item);
      console.log(`  [${idx + 1}] 包含 ${keys.length} 个字段:`, keys.slice(0, 10).join(', '), '...');
    });
  }
  
  const total = queryData.length;
  const withComprehensive = queryData.filter(item => (item['综合得分'] || item[FIELD_NAMES.comprehensive]) != null).length;
  const avgComprehensive = queryData
    .filter(item => (item['综合得分'] || item[FIELD_NAMES.comprehensive]) != null)
    .reduce((sum, item) => sum + ((item['综合得分'] || item[FIELD_NAMES.comprehensive]) || 0), 0) / withComprehensive || 0;
  
  const categories: Record<string, number> = {};
  queryData.forEach(item => {
    const cat = (item['初步产品分类'] || item[FIELD_NAMES.category] || '其他') as string;
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  const dataSummary = `数据概览：
- 查询到的产品数：${total}
- 有综合得分的产品：${withComprehensive}
- 平均综合得分：${avgComprehensive.toFixed(2)}
- 产品分类分布：${Object.entries(categories).map(([k, v]) => `${k}(${v})`).join(', ')}`;
  
  const prompt = `你是一个专业的亚马逊选品分析师，擅长基于多维表格数据进行产品选品分析和市场洞察。
【数据来源】
你需要分析的数据来自选品结果表，该表包含以下关键字段：
- ASIN、商品标题
- 月销量、月销量增长率、月销售额
- 小类BSR、大类BSR、大类BSR增长率
- 评分数、卖家数、上架天数、LQS
- 毛利率、FBA($)
- 需求趋势得分、竞争强度得分、利润空间得分、综合得分
- 初步产品分类、最终产品分类、选品结论、优先级、AI 选品解读、AI 选品建议、AI 选品分析
其中，"AI 选品解读" 和 "AI 选品建议" 字段是之前生成的解释和建议，你可以把它们当作补充参考信息，但最终判断仍需基于本次提供的具体数据和数值。
  
【重要说明】
**竞争强度得分**的含义：竞争强度得分越高，说明该产品的竞争环境越不饱和，竞争机会越大。这是因为该维度采用了反向量化计算方式，即：得分越高 = 竞争压力越小 = 进入机会越大。
  
【分析原则】
1. 必须基于实际数据进行回答，引用具体的数据和数值
2. 如果问题涉及产品推荐，请按综合得分排序进行分析
3. 如果问题涉及市场趋势，请分析整体数据分布和特征
4. 如果问题涉及竞争环境，请结合竞争强度得分、卖家数、BSR等指标。记住：竞争强度得分越高表示竞争机会越大（反向量化）
5. 如果问题涉及利润空间，请结合利润空间得分、毛利率、FBA费用等指标
6. 回答要专业、准确、有洞察力，基于实际数据进行分析
  
【输出要求】
- 你的回答需要填入选品结果表的"AI 选品分析"字段
- 回答要简洁明了，重点突出
- 如果涉及具体产品，请列出ASIN和商品标题
- 如果涉及数据，请提供具体数值
- 控制在500字以内
- 直接输出分析结果，不需要额外的格式说明

【数据概览】
${dataSummary}

【产品数据】
共查询到 ${queryData.length} 条产品数据：

${JSON.stringify(dataForAI, null, 2)}

【用户问题】
${question}`;

  return await callMoonshotAPI(prompt, signal);
}

// 调用 Moonshot (Kimi) API（使用配置中的 apiUrl / apiKey）
async function callMoonshotAPI(prompt: string, signal?: AbortSignal): Promise<string> {
  try {
    const { apiUrl, apiKey } = currentApiConfig;
    if (!apiKey) {
      throw new Error('请先在插件配置中填写 API Key（配置插件 → 右侧填写 API 地址和 API Key → 确定）');
    }
    console.log('📡 调用 API:', apiUrl);
    console.log('📡 模型:', currentApiConfig.model);
    
    // 创建超时控制器
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 60000); // 60秒超时
    
    // 合并信号：如果传入的 signal 被中断，或者超时，都中断请求
    const combinedSignal = signal || timeoutController.signal;
    if (signal) {
      signal.addEventListener('abort', () => {
        timeoutController.abort();
        clearTimeout(timeoutId);
      });
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: currentApiConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        // 兼容主流模型默认习惯，保持 temperature = 1，仅缩短最大输出长度加速
        temperature: 1,
        max_tokens: 800
      }),
      signal: combinedSignal
    });
    
    clearTimeout(timeoutId);
    
    console.log('📡 API 响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('📡 API 错误响应:', errorText);
      throw new Error(`API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📡 API 响应数据:', result);
    
    const answer = result.choices?.[0]?.message?.content || '无法生成回答';
    
    if (!answer || answer === '无法生成回答') {
      throw new Error('AI 返回空回答');
    }
    
    return answer;
  } catch (error: any) {
    console.error('Moonshot API 调用失败:', error);
    
    // 提供更详细的错误信息
    if (error.name === 'AbortError') {
      throw new Error('API 调用超时，请稍后重试');
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_CLOSED')) {
      throw new Error('网络连接失败，请检查网络或 API 服务是否可用');
    } else {
      throw new Error(`API 调用失败: ${error?.message || error}`);
    }
  }
}

// 布局调试：打印各层高度，用于确认输入框是否固定在底部
function debugLayout() {
  const app = document.getElementById('app');
  const viewRoot = document.getElementById('view-root');
  const panelContainer = document.getElementById('qa-panel-container');
  const layoutRoot = document.querySelector('.qa-layout-root');
  const qaScroll = document.querySelector('.qa-scroll');
  const inputBar = document.querySelector('.qa-input-bar');
  const entries: Array<{ name: string; el: Element | null; height: number; scrollHeight: number; overflow: string }> = [];
  for (const [name, el] of [
    ['#app', app],
    ['#view-root', viewRoot],
    ['#qa-panel-container', panelContainer],
    ['.qa-layout-root', layoutRoot],
    ['.qa-scroll(可滚动区)', qaScroll],
    ['.qa-input-bar', inputBar]
  ] as const) {
    if (!el) continue;
    const style = window.getComputedStyle(el as HTMLElement);
    const rect = (el as HTMLElement).getBoundingClientRect();
    entries.push({
      name,
      el,
      height: Math.round(rect.height),
      scrollHeight: (el as HTMLElement).scrollHeight,
      overflow: style.overflowY
    });
  }
  console.log('🔧 布局调试（高度链）:', entries.map(e => `${e.name}: height=${e.height} scrollHeight=${e.scrollHeight} overflowY=${e.overflow}`).join(' | '));
  if (qaScroll && (qaScroll as HTMLElement).scrollHeight > (qaScroll as HTMLElement).clientHeight) {
    console.log('✅ 中间区域可滚动，输入框应贴底');
  } else if (layoutRoot) {
    const lr = layoutRoot as HTMLElement;
    console.log('📐 qa-layout-root 总高:', lr.scrollHeight, 'clientHeight:', lr.clientHeight, lr.scrollHeight > lr.clientHeight ? '→ 整块在滚，需检查父级高度' : '→ 未溢出');
  }
}

// 添加消息到历史
function addMessageToHistory(historyDiv: HTMLElement, role: 'user' | 'ai', content: string, id?: string) {
  const messageDiv = document.createElement('div');
  messageDiv.id = id || '';
  messageDiv.style.cssText = `
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    ${role === 'user' 
      ? 'background: #e3f2fd; margin-left: 15%; text-align: right;' 
      : 'background: white; margin-right: 15%; border: 1px solid #dfe1e6;'
    }
  `;
  
  messageDiv.innerHTML = `
    <div style="font-size: 11px; color: #5e6c84; margin-bottom: 2px;">
      ${role === 'user' ? '👤 用户' : '🤖 AI'}
    </div>
    <div style="font-size: 12px; color: #172b4d; line-height: 1.5; white-space: pre-wrap;">
      ${content}
    </div>
  `;
  
  historyDiv.appendChild(messageDiv);
  const scrollContainer = historyDiv.closest('.qa-scroll') as HTMLElement;
  if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

// 更新消息
function updateMessage(historyDiv: HTMLElement, id: string, content: string) {
  const messageDiv = document.getElementById(id);
  if (messageDiv) {
    const contentDiv = messageDiv.querySelector('div:last-child');
    if (contentDiv) {
      contentDiv.textContent = content;
    }
  }
  const scrollContainer = historyDiv.closest('.qa-scroll') as HTMLElement;
  if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

// 初始化
init();
