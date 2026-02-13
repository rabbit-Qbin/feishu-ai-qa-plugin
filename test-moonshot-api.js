// 测试 Moonshot API
const MOONSHOT_API_KEY = 'sk-Ks0g9FuQKrIacdJn7oBMpRmY3FZNXx4rOYywdc0nfiu2HJui';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MOONSHOT_MODEL = 'moonshot-v1-8k'; // 或者 moonshot-v1-32k, moonshot-v1-128k

async function testMoonshotAPI() {
  console.log('🧪 开始测试 Moonshot API...');
  console.log('📡 API URL:', MOONSHOT_API_URL);
  console.log('🤖 模型:', MOONSHOT_MODEL);
  console.log('🔑 API Key:', MOONSHOT_API_KEY.substring(0, 20) + '...');
  
  const testPrompt = '你好，请简单介绍一下你自己。';
  
  try {
    console.log('\n📤 发送请求...');
    const response = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: MOONSHOT_MODEL,
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
    
    return { success: true, answer, model: MOONSHOT_MODEL };
    
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
testMoonshotAPI().then(result => {
  if (result.success) {
    console.log('\n✅ 测试通过：Moonshot API 正常工作');
    console.log('✅ 使用的模型:', result.model);
    process.exit(0);
  } else {
    console.log('\n❌ 测试失败：Moonshot API 无法访问');
    console.log('💡 可能的原因：');
    console.log('   1. API Key 无效或已过期');
    console.log('   2. 网络连接问题');
    console.log('   3. API 端点不正确');
    process.exit(1);
  }
});

