import { workspace, dashboard } from '@lark-base-open/js-sdk';

// 常量定义
const FIELD_NAMES = {
  demand: '需求趋势得分',
  competition: '竞争强度得分',
  profit: '利润空间得分',
  comprehensive: '综合得分',
  title: '商品标题',
  asin: 'ASIN',
  category: '初步产品分类'
};

// ZAI GLM-4.7 API 配置
const ZAI_API_KEY = '836a7db496194bc9a85633c57ac4a96d.CE60TsCoQF3eIv7D';
const ZAI_API_URL = 'https://api.zai.dev/v1/chat/completions';
const ZAI_MODEL = 'zai/glm-4.7';

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
    <div style="display: flex; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
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
        
        <!-- 确定按钮（固定在底部） -->
        <button id="save-btn" style="position: fixed; bottom: 0; right: 0; width: 340px; padding: 16px; font-size: 14px; font-weight: 600; background: #0052cc; color: white; border: none; cursor: pointer; disabled: true;">
          确定
        </button>
      </div>
    </div>
  `;
  
  // 自动查找"选品结果"表
  await autoFindTable();
  
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

// View 状态：只显示问答界面（按照官方文档要求）
async function renderViewState(app: HTMLElement) {
  app.innerHTML = `
    <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div id="status" style="padding: 12px; background: #f4f5f7; border-radius: 4px; color: #5e6c84; font-size: 13px; margin-bottom: 16px;">
        ⏳ 正在加载数据...
      </div>
      <div id="qa-view"></div>
    </div>
  `;
  
  // 使用 getData 获取数据（官方文档要求）
  try {
    const config: any = await dashboard.getConfig();
    if (!config?.dataConditions?.[0]?.baseToken || !config?.dataConditions?.[0]?.tableId) {
      throw new Error('未找到保存的配置，请重新配置插件');
    }
    
    const baseToken = config.dataConditions[0].baseToken;
    const tableId = config.dataConditions[0].tableId;
    
    // 使用 getData 获取数据（官方文档要求）
    // getData 会使用保存的 dataConditions，不需要传参数
    const dataResult = await dashboard.getData();
    console.log('📊 getData 返回:', dataResult);
    
    // 由于 getData 可能只返回聚合数据，我们需要通过 workspace 获取原始数据
    const bitableApp = await workspace.getBitable(baseToken);
    if (!bitableApp) {
      throw new Error('无法获取多维表格实例');
    }
    
    const table = await bitableApp.base.getTableById(tableId);
    const tableInfo = await loadTableInfoFromTable(table);
    
    const qaView = document.getElementById('qa-view')!;
    renderQAPanel(tableInfo, qaView);
    
    const status = document.getElementById('status')!;
    status.style.display = 'none';
    
  } catch (error: any) {
    console.error('View 状态加载失败:', error);
    const status = document.getElementById('status')!;
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
    // 构建 dataConditions（必须包含 baseToken 和 tableId）
    const dataConditions = [{
      baseToken: foundTableInfo.baseToken,
      tableId: foundTableInfo.tableId
    }];
    
    console.log('💾 保存 dataConditions:', JSON.stringify(dataConditions, null, 2));
    
    // 保存配置（官方文档要求）
    await dashboard.saveConfig({
      dataConditions,
      customConfig: {}
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
  
  for (const field of fieldList) {
    const name = await field.getName();
    fieldIds[name] = field.id;
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
    totalCount,
    withComprehensiveCount: withComprehensive,
    avgComprehensive,
    categories: Object.keys(categories)
  };
}

// 提取值
function extractValue(val: any): any {
  if (Array.isArray(val) && val.length > 0) return val[0];
  if (val && typeof val === 'object' && 'text' in val) return val.text;
  return val;
}

// 渲染问答面板
function renderQAPanel(tableInfo: any, container: HTMLElement) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <h1 style="color: #172b4d; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; text-align: center;">AI 选品算命</h1>
      
      <div style="flex: 1; display: flex; flex-direction: column; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
        <div id="qa-history" style="flex: 1; overflow-y: auto; margin-bottom: 16px; padding: 16px; background: #fafbfc; border-radius: 4px; min-height: 200px;">
          <div style="color: #5e6c84; font-size: 13px; text-align: center; padding: 20px;">
            开始提问，AI 将基于选品数据为您分析
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <textarea 
            id="question-input" 
            placeholder="输入您的问题，例如：推荐综合得分最高的10个产品..."
            style="flex: 1; padding: 12px; border: 1px solid #dfe1e6; border-radius: 4px; font-size: 13px; resize: none; min-height: 60px; font-family: inherit;"
          ></textarea>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button 
              id="ask-btn" 
              style="padding: 8px 24px; border: none; background: #0052cc; color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;"
            >
              提问
            </button>
            <button 
              id="clear-btn" 
              style="padding: 8px 24px; border: 1px solid #dfe1e6; background: white; color: #5e6c84; border-radius: 4px; cursor: pointer; font-size: 13px;"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 绑定事件
  const questionInput = document.getElementById('question-input') as HTMLTextAreaElement;
  const askBtn = document.getElementById('ask-btn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const historyDiv = document.getElementById('qa-history')!;
  
  askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    if (!question) {
      alert('请输入问题');
      return;
    }
    await askAI(question, tableInfo, historyDiv);
  });
  
  questionInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      const question = questionInput.value.trim();
      if (question) {
        await askAI(question, tableInfo, historyDiv);
      }
    }
  });
  
  clearBtn.addEventListener('click', () => {
    questionInput.value = '';
    historyDiv.innerHTML = `
      <div style="color: #5e6c84; font-size: 13px; text-align: center; padding: 20px;">
        开始提问，AI 将基于选品数据为您分析
      </div>
    `;
  });
}

// 调用 AI API（智能体模式）
async function askAI(question: string, tableInfo: any, historyDiv: HTMLElement) {
  const askBtn = document.getElementById('ask-btn') as HTMLButtonElement;
  const questionInput = document.getElementById('question-input') as HTMLTextAreaElement;
  
  askBtn.disabled = true;
  askBtn.textContent = '分析中...';
  
  addMessageToHistory(historyDiv, 'user', question);
  
  const answerId = `answer-${Date.now()}`;
  addMessageToHistory(historyDiv, 'ai', '正在分析问题并决定需要哪些数据...', answerId);
  
  try {
    updateMessage(historyDiv, answerId, '🤖 正在分析问题，决定需要读取哪些数据...');
    const queryPlan = await analyzeQuestionAndPlanQuery(question, tableInfo);
    
    console.log('📋 AI 查询计划:', queryPlan);
    
    updateMessage(historyDiv, answerId, `📊 正在读取数据：${queryPlan.description || '按计划查询'}...`);
    const queryData = await executeQueryPlan(queryPlan, tableInfo);
    
    console.log(`✅ 查询完成，获取 ${queryData.length} 条数据`);
    
    updateMessage(historyDiv, answerId, '💡 正在基于数据生成分析...');
    const answer = await generateAnswer(question, queryData);
    
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

// 第一阶段：分析问题并制定查询计划
async function analyzeQuestionAndPlanQuery(question: string, tableInfo: any): Promise<any> {
  const prompt = `你是一个数据查询规划助手。用户想要分析"选品结果表"的数据。

【表结构信息】
表名：选品结果表
可用字段：
- ASIN、商品标题
- 月销量、月销量增长率、月销售额
- 小类BSR、大类BSR、大类BSR增长率
- 评分数、卖家数、上架天数、LQS
- 毛利率、FBA($)
- 需求趋势得分、竞争强度得分、利润空间得分、综合得分
- 初步产品分类、最终产品分类、选品结论、优先级

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
  "sortField": "排序字段名（如：综合得分、需求趋势得分等，如果不需要排序则为null）",
  "sortOrder": "asc 或 desc",
  "limit": 需要查询的记录数量（建议50-200，如果不需要限制则为null）,
  "filterCategory": "筛选的产品分类（如：畅销爆品、稳健产品等，如果不需要筛选则为null）",
  "minScore": {"field": "字段名", "value": 最小值} 或 null,
  "maxScore": {"field": "字段名", "value": 最大值} 或 null,
  "requiredFields": ["需要返回的字段名列表"]
}

只返回 JSON 对象，不要其他文字。`;

  const response = await callZAIAPI(prompt);
  
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    const plan = JSON.parse(jsonStr);
    
    return {
      description: plan.description || '查询数据',
      sortField: plan.sortField || null,
      sortOrder: plan.sortOrder || 'desc',
      limit: plan.limit || 100,
      filterCategory: plan.filterCategory || null,
      minScore: plan.minScore || null,
      maxScore: plan.maxScore || null,
      requiredFields: plan.requiredFields || ['ASIN', '商品标题', '需求趋势得分', '竞争强度得分', '利润空间得分', '综合得分', '初步产品分类']
    };
  } catch (e) {
    console.warn('解析查询计划失败，使用默认计划:', e);
    return {
      description: '默认查询',
      sortField: '综合得分',
      sortOrder: 'desc',
      limit: 100,
      filterCategory: null,
      minScore: null,
      maxScore: null,
      requiredFields: ['ASIN', '商品标题', '需求趋势得分', '竞争强度得分', '利润空间得分', '综合得分', '初步产品分类']
    };
  }
}

// 第二阶段：执行查询计划
async function executeQueryPlan(plan: any, tableInfo: any): Promise<any[]> {
  const { table, fieldIds } = tableInfo;
  
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
  } while (pageToken && (!plan.limit || allRecords.length < plan.limit * 2));
  
  console.log(`📋 获取 ${allRecords.length} 条记录，开始处理...`);
  
  const data: any[] = [];
  const batchSize = 50;
  
  for (let i = 0; i < allRecords.length && (!plan.limit || data.length < plan.limit * 2); i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    const batchData = await Promise.all(
      batch.map(async (record: any) => {
        try {
          const values: any = {};
          const fieldsToGet = plan.requiredFields || Object.keys(fieldIds);
          for (const fieldName of fieldsToGet) {
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
  
  return filteredData;
}

// 第三阶段：生成回答
async function generateAnswer(question: string, queryData: any[]): Promise<string> {
  const dataForAI = queryData.map(item => ({
    ASIN: item['ASIN'] || item[FIELD_NAMES.asin] || 'N/A',
    商品标题: ((item['商品标题'] || item[FIELD_NAMES.title] || 'N/A') as string).substring(0, 100),
    需求趋势得分: item['需求趋势得分'] || item[FIELD_NAMES.demand] || 0,
    竞争强度得分: item['竞争强度得分'] || item[FIELD_NAMES.competition] || 0,
    利润空间得分: item['利润空间得分'] || item[FIELD_NAMES.profit] || 0,
    综合得分: item['综合得分'] || item[FIELD_NAMES.comprehensive] || 0,
    初步产品分类: item['初步产品分类'] || item[FIELD_NAMES.category] || '其他'
  }));
  
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
- 初步产品分类、最终产品分类、选品结论、优先级、AI 选品解读、AI 选品分析

【分析原则】
1. 必须基于实际数据进行回答，引用具体的数据和数值
2. 如果问题涉及产品推荐，请按综合得分排序进行分析
3. 如果问题涉及市场趋势，请分析整体数据分布和特征
4. 如果问题涉及竞争环境，请结合竞争强度得分、卖家数、BSR等指标
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

  return await callZAIAPI(prompt);
}

// 调用 ZAI GLM API
async function callZAIAPI(prompt: string): Promise<string> {
  try {
    console.log('📡 调用 ZAI API:', ZAI_API_URL);
    console.log('📡 模型:', ZAI_MODEL);
    
    const response = await fetch(ZAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: ZAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      // 添加超时处理（使用 AbortController）
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 60000); // 60秒超时
        return controller.signal;
      })()
    });
    
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
    console.error('ZAI API 调用失败:', error);
    
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

// 添加消息到历史
function addMessageToHistory(historyDiv: HTMLElement, role: 'user' | 'ai', content: string, id?: string) {
  const messageDiv = document.createElement('div');
  messageDiv.id = id || '';
  messageDiv.style.cssText = `
    margin-bottom: 16px;
    padding: 12px 16px;
    border-radius: 8px;
    ${role === 'user' 
      ? 'background: #e3f2fd; margin-left: 20%; text-align: right;' 
      : 'background: white; margin-right: 20%; border: 1px solid #dfe1e6;'
    }
  `;
  
  messageDiv.innerHTML = `
    <div style="font-size: 13px; color: #5e6c84; margin-bottom: 4px;">
      ${role === 'user' ? '👤 您' : '🤖 AI'}
    </div>
    <div style="font-size: 14px; color: #172b4d; line-height: 1.6; white-space: pre-wrap;">
      ${content}
    </div>
  `;
  
  historyDiv.appendChild(messageDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
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
  historyDiv.scrollTop = historyDiv.scrollHeight;
}

// 初始化
init();
