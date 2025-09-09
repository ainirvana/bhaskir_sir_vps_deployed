// Test the quiz generation API
console.log('Testing quiz generation...');

// Sample article IDs (you should replace these with actual article IDs from your database)
const testArticleIds = ['1', '2', '3']; // Replace with real IDs

fetch('/api/generate-quiz', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Test Quiz',
    articleIds: testArticleIds,
    questionsPerArticle: 3
  }),
})
.then(response => response.json())
.then(data => {
  console.log('Quiz generation result:', data);
  
  if (data.error) {
    console.error('Error:', data.error);
  } else {
    console.log('Quiz generated successfully!');
    console.log('Quiz data:', data);
    
    // Save to localStorage for testing
    const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
    savedQuizzes.push(data);
    localStorage.setItem('savedQuizzes', JSON.stringify(savedQuizzes));
    
    console.log('Quiz saved to localStorage');
    console.log('Quiz ID:', data.id);
    console.log('You can now test viewing it at: /quizzes/' + data.id);
  }
})
.catch(error => {
  console.error('Fetch error:', error);
});
