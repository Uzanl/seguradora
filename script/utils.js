const searchBox = document.querySelector('.search-box');
const suggestionList = document.querySelector('.suggestion-list');
const aside = document.querySelector('aside');
const toggleBtn = document.querySelector('.toggle-btn');

document.querySelectorAll('.submenu').forEach(menu => {
    console.log("cheguei aqui!!!")
    menu.addEventListener('mouseenter', () => {
        menu.setAttribute('aria-expanded', 'true');
    });
    menu.addEventListener('mouseleave', () => {
        menu.setAttribute('aria-expanded', 'false');
    });
  });

  /*clearButton.addEventListener('click', () => {
    clearButton.style.display = 'none';
    searchBox.value = '';
    suggestionList.style.display = 'none';
  });*/

  toggleBtn.addEventListener('click', function () {
    aside.classList.toggle('active');
    toggleBtn.classList.toggle('active');
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
  
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    aside.hidden = isExpanded;
  });

  searchBox.addEventListener('input', async function () {
    const inputText = searchBox.value.trim().toLowerCase();
  
    if (inputText === '') {
      suggestionList.style.display = 'none';
      clearButton.style.display = 'none';
      return;
    }
  
    clearButton.style.display = inputText.length > 0 ? 'block' : 'none';
  
    try {
      const response = await fetch(`/search?term=${inputText}`);
      const data = await response.json();
      const suggestions = data.results;
  
      suggestionList.innerHTML = '';
  
      suggestions.forEach((suggestion, index) => {
        const suggestionItem = document.createElement('li');
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.textContent = `Cliente: ${suggestion.resultado}`;
  
       /* suggestionItem.addEventListener('click', function () {
          const path = suggestion.tipo === 'usuário'
            ? `/perfil?page=1&id=${suggestion.id}`
            : `/artigo/${suggestion.id}`;
          window.location.href = path; // Caminho relativo a partir da raiz do site
        });*/
  
        suggestionItem.addEventListener('mouseenter', function () {
          highlightSuggestion(index);
        });
  
        suggestionList.appendChild(suggestionItem);
      });
  
      suggestionList.style.display = suggestions.length > 0 ? 'block' : 'none';
    } catch (error) {
      console.error('Erro ao obter sugestões do servidor:', error);
    }
  });
  
  let highlightedIndex = -1;
  
  searchBox.addEventListener('keydown', function (e) {
    const suggestions = suggestionList.querySelectorAll('.suggestion-item');
    if (e.key === 'ArrowDown') {
      highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
      highlightSuggestion(highlightedIndex);
    } else if (e.key === 'ArrowUp') {
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      highlightSuggestion(highlightedIndex);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        const selectedItem = suggestions[highlightedIndex];
        selectedItem.click();
      }
    }
  });