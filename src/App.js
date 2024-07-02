import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import verbsData from './data/verbsData.json';
import achievements from './data/achievements.json';
import greentick from './images/greentick.png';
import xsign from './images/xsign.png';
import repeatIcon from './images/repeat.png';
import turtleButton from './images/turtlebutton.png';
import speechOn from './images/speech-on.png';
import speechOff from './images/speech-off.png';
import musicOn from './images/music-on.png';
import musicOff from './images/music-off.png';
import backgroundMusic from './background.mp3';
import rightDing from './right-ding.mp3';
import wrongDing from './wrong-ding.mp3';

console.log('Number of verbs:', verbsData.length);

function App() {
  const [score, setScore] = useState(0);
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [currentVerb, setCurrentVerb] = useState('');
  const [englishCorrect, setEnglishCorrect] = useState('');
  const [optionsWithImages, setOptionsWithImages] = useState([]);
  const [achievedMilestones, setAchievedMilestones] = useState([]);
  const [disableOptions, setDisableOptions] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [verbCycle, setVerbCycle] = useState([]);
  const [incorrectVerbsQueue, setIncorrectVerbsQueue] = useState([]);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(true);
  const [backgroundMusicVolume, setBackgroundMusicVolume] = useState(0.2); // 20% volume
  const [achievementMessage, setAchievementMessage] = useState(''); // New state for achievement message
  const [buttonText, setButtonText] = useState('Start Game'); // State for button text
  const [clickedOptions, setClickedOptions] = useState([]); // New state for tracking clicked options

  const audioRef = useRef(null);
  const bgMusicRef = useRef(new Audio(backgroundMusic)); // Background music reference

  useEffect(() => {
    const shuffledVerbs = shuffleArray([...verbsData]);
    setVerbCycle(shuffledVerbs);
  }, []);

  useEffect(() => {
    if (verbCycle.length > 0 && gameStarted) {
      setupRound(verbCycle[currentVerbIndex]);
      setDisableOptions(false);
    }
  }, [verbCycle, currentVerbIndex, gameStarted]);

  useEffect(() => {
    checkAchievements(score);
  }, [score]);

  useEffect(() => {
    if (backgroundMusicEnabled) {
      bgMusicRef.current.volume = backgroundMusicVolume;
      bgMusicRef.current.loop = true;
      bgMusicRef.current.play().catch(error => {
        console.error('Autoplay was prevented. Please click anywhere on the page to enable audio playback.');
      });
    } else {
      bgMusicRef.current.pause();
    }
  }, [backgroundMusicEnabled, backgroundMusicVolume]);

  useEffect(() => {
    if (gameStarted) {
      // Restart background music from the beginning when game starts
      if (backgroundMusicEnabled) {
        bgMusicRef.current.currentTime = 0; // Reset to start
        bgMusicRef.current.volume = backgroundMusicVolume;
        bgMusicRef.current.play().catch(error => {
          console.error('Autoplay was prevented. Please click anywhere on the page to enable audio playback.');
        });
      }
    }
  }, [gameStarted, backgroundMusicEnabled]);

  const startGame = () => {
    setGameStarted(true);
    setCurrentVerbIndex(0);
  };

  const setupRound = (verbObject) => {
    setCurrentVerb(verbObject.spanish);
    setEnglishCorrect(verbObject.englishCorrect);
    setClickedOptions([]); // Reset clicked options for new round

    const exceptions = verbObject.exceptions 
      ? Array.isArray(verbObject.exceptions) 
        ? verbObject.exceptions 
        : [verbObject.exceptions]
      : [];

    const excludedVerbs = [verbObject.spanish, ...exceptions];

    const otherVerbs = verbCycle.filter((verb) => {
      if (verb.spanish === verbObject.spanish) return false;

      const verbExceptions = verb.exceptions
        ? Array.isArray(verb.exceptions)
          ? verb.exceptions
          : [verb.exceptions]
        : [];

      if (
        excludedVerbs.includes(verb.spanish) ||
        verbExceptions.some((exc) => excludedVerbs.includes(exc))
      ) {
        return false;
      }

      return true;
    });

    const randomVerbs = shuffleArray(otherVerbs).slice(0, 3);

    const options = [{ ...verbObject }, ...randomVerbs];

    shuffleArray(options);

    const optionsWithImages = options.map((option) => ({
      englishCorrect: option.englishCorrect,
      image: option.image,
    }));

    console.log('Options for this round:', optionsWithImages);

    setOptionsWithImages(optionsWithImages);

    // Set the current audio file for the new round
    const audioElement = new Audio(verbObject.audio);
    audioRef.current = audioElement; // Save the reference
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleGuess = (selectedOption) => {
    if (disableOptions || clickedOptions.includes(selectedOption)) return;

    setClickedOptions([...clickedOptions, selectedOption]);

    let updatedOptions = [...optionsWithImages];

    if (selectedOption === englishCorrect) {
      setScore(score + 1);

      updatedOptions = updatedOptions.map(option => {
        if (option.englishCorrect === selectedOption) {
          return { ...option, image: greentick };
        }
        return option;
      });
      setOptionsWithImages(updatedOptions);
      setDisableOptions(true);

      const rightDingSound = new Audio(rightDing); // Create a new instance for each click
      rightDingSound.play(); // Play right-ding sound

      setTimeout(() => {
        advanceToNextRound();
        setDisableOptions(false);
      }, 1000);

    } else {
      updatedOptions = updatedOptions.map(option => {
        if (option.englishCorrect === selectedOption) {
          return { ...option, image: xsign };
        }
        return option;
      });
      setOptionsWithImages(updatedOptions);

      setScore(score - 3 < 0 ? 0 : score - 3);

      const wrongDingSound = new Audio(wrongDing); // Create a new instance for each click
      wrongDingSound.play(); // Play wrong-ding sound

      const reappearanceRound = currentVerbIndex + 4;
      if (!incorrectVerbsQueue.some(verb => verb.spanish === verbCycle[currentVerbIndex].spanish)) {
        setIncorrectVerbsQueue([...incorrectVerbsQueue, { ...verbCycle[currentVerbIndex], reappearanceRound }]);
      }
    }
  };

  const advanceToNextRound = () => {
    const reappearingVerbs = incorrectVerbsQueue.filter(verb => verb.reappearanceRound === currentVerbIndex);
    if (reappearingVerbs.length > 0) {
      const updatedVerbCycle = [...verbCycle];
      reappearingVerbs.forEach(verb => {
        updatedVerbCycle.splice(currentVerbIndex + 1, 0, verb);
      });
      setVerbCycle(updatedVerbCycle);
      setIncorrectVerbsQueue(incorrectVerbsQueue.filter(verb => verb.reappearanceRound !== currentVerbIndex));
    }

    if (currentVerbIndex + 1 < verbCycle.length) {
      setCurrentVerbIndex(currentVerbIndex + 1);
    } else {
      setVerbCycle(shuffleArray([...verbsData]));
      setCurrentVerbIndex(0);
    }
  };

  const checkAchievements = (currentScore) => {
    achievements.forEach(achievement => {
      if (currentScore >= achievement.score && !achievedMilestones.includes(achievement.score)) {
        setAchievedMilestones([...achievedMilestones, achievement.score]);
        setAchievementMessage(achievement.message); // Update state to show the achievement message
        setTimeout(() => setAchievementMessage(''), 5000); // Hide message after 5 seconds
      }
    });
  };

  const playAudio = (rate) => {
    if (audioRef.current) {
      const audioElement = new Audio(audioRef.current.src); // Create a new audio instance
      audioElement.playbackRate = rate; // Set the playback rate
      audioElement.currentTime = 0; // Reset to start
      audioElement.play().catch(error => {
        console.error('Autoplay was prevented. Please click anywhere on the page to enable audio playback.');
      });
    }
  };

  const handleSlowReplay = () => {
    playAudio(0.5); // Slow speed
  };

  const handleRegularReplay = () => {
    playAudio(1); // Normal speed
  };

  const toggleAutoplay = () => {
    setAutoplayEnabled(!autoplayEnabled);
  };

  const toggleBackgroundMusic = () => {
    setBackgroundMusicEnabled(!backgroundMusicEnabled);
  };

  const adjustVolume = (event) => {
    const volume = event.target.value / 100;
    setBackgroundMusicVolume(volume);
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = volume;
    }
  };

  // Handlers for changing button text on hover
  const handleMouseEnter = () => {
    setButtonText('Empezar Juego');
  };

  const handleMouseLeave = () => {
    setButtonText('Start Game');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Linguimage Game</h1>
        
        {/* Achievement popup */}
        {achievementMessage && (
          <div className="achievement-popup">
            {achievementMessage}
          </div>
        )}

        {gameStarted && <p>Score: {score}</p>}
        
        {gameStarted ? (
          <>
            <p className="current-verb">Current Verb: {currentVerb}</p>
            <div className="options">
              {optionsWithImages.map((option, index) => (
                <button key={index} onClick={() => handleGuess(option.englishCorrect)} disabled={disableOptions}>
                  <div className="option-container">
                    <img src={option.image} alt={option.englishCorrect} className="option-image" />
                    <p className="option-text">{option.englishCorrect}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="audio-menu">
              <div className="menu-item">
                <img src={repeatIcon} alt="Replay Audio" onClick={handleRegularReplay} />
               
              </div>
              <div className="menu-item">
                <img
                  src={turtleButton}
                  alt="Slow Replay"
                  onClick={handleSlowReplay}
                />
                <p>Slow Replay</p>
              </div>
              <div className="menu-item">
                <img
                  src={backgroundMusicEnabled ? musicOn : musicOff}
                  alt="Toggle Music"
                  onClick={toggleBackgroundMusic}
                />
                <p>{backgroundMusicEnabled ? 'Music On' : 'Music Off'}</p>
              </div>
              <div className="menu-item">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={backgroundMusicVolume * 100}
                  className="volume-slider"
                  onChange={adjustVolume}
                />
              </div>
            </div>
          
          </>
        ) : (
          <button 
            className="start-button" 
            onClick={startGame} 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
          >
            {buttonText}
          </button>
        )}
      </header>
    </div>
  );
}

export default App;
