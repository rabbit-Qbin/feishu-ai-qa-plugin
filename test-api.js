// 测试 ZAI API
const ZAI_API_KEY = '836a7db496194bc9a85633c57ac4a96d.CE60TsCoQF3eIv7D';
const ZAI_API_URL = 'https://api.zai.dev/v1/chat/completions';
const ZAI_MODEL = 'zai/glm-4.7';

async function testZAIAPI() {
  console.log('🧪 开始测试 ZAI API...');
  console.log('📡 API URL:', ZAI_API_URL);
  console.log('🤖 模型:', ZAI_MODEL);
  console.log('🔑 API Key:', ZAI_API_KEY.substring(0, 20) + '...');
  
  const testPrompt = '你好，请简单介绍一下你自己。';
  
  try {
    console.log('\n📤 发送请求...');
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
            content: testPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    console.log('📥 响应状态:', response.status, response.statusText);
    console.log('📥 响应头:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 错误响应:', errorText);
      throw new Error(`API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('\n✅ API 调用成功！');
    console.log('📋 响应数据:', JSON.stringify(result, null, 2));
    
    const answer = result.choices?.[0]?.message?.content || '无法生成回答';
    console.log('\n💬 AI 回答:', answer);
    
    return { success: true, answer };
    
  } catch (error) {
    console.error('\n❌ API 调用失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

// 运行测试
testZAIAPI().then(result => {
  if (result.success) {
    console.log('\n✅ 测试通过：API 正常工作');
    process.exit(0);
  } else {
    console.log('\n❌ 测试失败：API 无法访问');
    process.exit(1);
  }
});

