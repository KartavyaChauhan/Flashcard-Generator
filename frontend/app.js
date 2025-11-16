document.addEventListener('DOMContentLoaded', () => {
  // Element references
  const topicForm = document.getElementById('topic-form');
  const topicInput = document.getElementById('topic-input');
  const loadingMessage = document.getElementById('loading');
  const flashcardContainer = document.getElementById('flashcard-container');

  const questionEl = document.getElementById('question');
  const answerEl = document.getElementById('answer');
  const difficultyEl = document.getElementById('difficulty');

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const cardCounterEl = document.getElementById('card-counter');

  // State
  let currentFlashcards = [];
  let currentIndex = 0;
  // Event listeners
  topicForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the form from refreshing the page

    const topic = topicInput.value;
    if (!topic) {
      alert('Please enter a topic.');
      return;
    }

    // Show loading and hide any existing flashcards
    loadingMessage.classList.remove('hidden');
    flashcardContainer.classList.add('hidden');

    try {
      // Call backend API
      const response = await fetch('http://localhost:3000/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic }), // Send { "topic": "..." }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch flashcards.');
      }

      // Received flashcards
      currentFlashcards = await response.json();
      currentIndex = 0; // Reset to the first card

      // Show the first card
      displayCard(currentIndex);

      // Show the flashcard container and hide loading
      flashcardContainer.classList.remove('hidden');

    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error fetching flashcards:', error);
    } finally {
      // Always hide the loading message when done
      loadingMessage.classList.add('hidden');
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < currentFlashcards.length - 1) {
      currentIndex++;
      displayCard(currentIndex);
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      displayCard(currentIndex);
    }
  });

  // Helper: render card at index
  function displayCard(index) {
    if (currentFlashcards.length === 0) return;

    const card = currentFlashcards[index];

    // Update the text content
    questionEl.textContent = card.question;
    answerEl.textContent = card.answer;
    difficultyEl.textContent = card.difficulty;

    // Update the card counter
    cardCounterEl.textContent = `${index + 1} / ${currentFlashcards.length}`;

    // Enable/disable buttons (Requirement #5)
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentFlashcards.length - 1;
  }
});
