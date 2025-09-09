// Test script to verify AI slide generation functionality
const testAISlideGeneration = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/articles/test-id/generate-slides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articleId: 'test-article-id'
      })
    });

    const data = await response.json();
    console.log('API Response:', data);
    
    if (response.ok) {
      console.log('✅ AI slide generation API is working');
    } else {
      console.log('❌ API error:', data.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

console.log('Testing AI slide generation API...');
testAISlideGeneration();
