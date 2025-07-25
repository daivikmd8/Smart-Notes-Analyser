// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements with null checks
  const noteArea = document.getElementById("noteArea");
  const wordCountElem = document.getElementById("wordCount");
  const topWordsElem = document.getElementById("topWords");
  const canvas = document.getElementById("wordChart");
  const networkStatusElem = document.getElementById("networkStatus");

  if (!noteArea || !wordCountElem || !topWordsElem || !canvas || !networkStatusElem) {
    console.error("One or more required elements not found in the DOM");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Could not get canvas context");
    return;
  }

  let idleHandle = 0;
  let statsCache = "";
  let reduceHeavyTasks = false;

  // Event listener for text input
  noteArea.addEventListener("input", () => {
    if (idleHandle) cancelIdleCallback(idleHandle);
    idleHandle = requestIdleCallback(analyzeNotes, { timeout: 1000 });
  });

  function analyzeNotes(deadline) {
    try {
      while ((deadline.timeRemaining() > 0 || deadline.didTimeout)) {
        const text = noteArea.value;
        if (text === statsCache) break; // No changes, skip processing
        
        statsCache = text;
        const words = text.match(/\b\w+\b/g) || [];
        const wordMap = {};
        
        words.forEach(w => {
          const word = w.toLowerCase();
          wordMap[word] = (wordMap[word] || 0) + 1;
        });

        const sortedWords = Object.entries(wordMap).sort((a, b) => b[1] - a[1]);
        const top = sortedWords.slice(0, 5);
        const topText = top.map(([word, count]) => `${word} (${count})`).join(', ');

        requestAnimationFrame(() => {
          wordCountElem.textContent = `Words: ${words.length}`;
          topWordsElem.textContent = `Top Words: ${topText}`;
          if (!reduceHeavyTasks) drawChart(top);
        });
      }
    } catch (error) {
      console.error("Error analyzing notes:", error);
    }
  }

  function drawChart(data) {
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!data.length) return;

      const barHeight = 20;
      const gap = 10;
      const maxWidth = 300;
      const maxCount = Math.max(...data.map(item => item[1]), 1);

      data.forEach(([word, count], index) => {
        const barLength = (count / maxCount) * maxWidth;
        const y = index * (barHeight + gap) + 10;

        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(10, y, barLength, barHeight);

        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.fillText(`${word} (${count})`, 10 + barLength + 10, y + barHeight - 5);
      });
    } catch (error) {
      console.error("Error drawing chart:", error);
    }
  }

  function checkNetworkStatus() {
    try {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (!connection) {
        networkStatusElem.textContent = "ℹ️ Network Information API not supported. Running in normal mode.";
        return;
      }

      const slowTypes = ["slow-2g", "2g"];
      if (slowTypes.includes(connection.effectiveType)) {
        networkStatusElem.textContent = `⚠️ You're on a ${connection.effectiveType} network. Heavy tasks will be minimized.`;
        reduceHeavyTasks = true;
      } else {
        networkStatusElem.textContent = `✅ Network OK (${connection.effectiveType})`;
        reduceHeavyTasks = false;
      }

      if (connection.addEventListener) {
        connection.addEventListener("change", checkNetworkStatus);
      }
    } catch (error) {
      console.error("Error checking network status:", error);
      networkStatusElem.textContent = "⚠️ Error checking network status";
    }
  }

  // Initialize
  checkNetworkStatus();
});