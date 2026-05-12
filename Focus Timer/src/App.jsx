import { useEffect, useRef, useState } from 'react';

const memoryStorage = {};

const presets = {
  Study: 45,
  Work: 90,
  Break: 15,
};

const DEFAULT_ALARM_URL = '/alarm.mp3';

const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch (e) {
    return false;
  }
};

const storage = {
  get(key, fallback = null) {
    try {
      if (Object.prototype.hasOwnProperty.call(memoryStorage, key)) {
        return memoryStorage[key];
      }

      if (!canUseStorage()) {
        return fallback;
      }

      const value = window.localStorage.getItem(key);

      return value ?? fallback;
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      memoryStorage[key] = value;

      if (canUseStorage()) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error(e);
    }
  },

  remove(key) {
    try {
      delete memoryStorage[key];

      if (canUseStorage()) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.error(e);
    }
  },
};

const getMinutes = (mode) => {
  const saved = storage.get(`focus-timer-${mode}`);

  return saved ? Number(saved) : presets[mode];
};

export default function StudyDevBreakTimer() {
  const [mode, setMode] = useState('Study');
  const [timeLeft, setTimeLeft] = useState(getMinutes('Study') * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(getMinutes('Study'));
  const [message, setMessage] = useState('');

  const [soundEnabled, setSoundEnabled] = useState(
    storage.get('focus-sound', 'true') === 'true'
  );

  const [vibrateEnabled, setVibrateEnabled] = useState(
    storage.get('focus-vibrate', 'true') === 'true'
  );

  const audioRef = useRef(null);

  const completeMessages = {
    Study: [
      'At last, break time.',
      'Brain cooldown unlocked.',
      'Stretch first before doomscrolling.',
    ],
    Work: [
      'I need to pee.',
      'Deploy complete.',
      'CPU temperature critical.',
    ],
    Break: [
      'Ok, back to work.',
      'Shut up, I get it.',
      'Break expired successfully.',
    ],
  };

  useEffect(() => {
    const cached = storage.get('focus-audio');

    if (cached) {
      audioRef.current = new Audio("/alarm.mp3");
      return;
    }

    audioRef.current = new Audio('/alarm.mp3');
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;

        return next <= 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (timeLeft > 0 || !isRunning) {
      return;
    }

    setIsRunning(false);

    const messages = completeMessages[mode] || [];

    if (messages.length > 0) {
      const randomIndex = Math.floor(Math.random() * messages.length);
      setMessage(messages[randomIndex]);
    }

    playAlarm();
  }, [timeLeft, isRunning, mode]);

  const playAlarm = () => {
    try {
      if (!soundEnabled) {
        return;
      }

      const audio = audioRef.current || new Audio("/alarm.mp3");

      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      audio.loop = true;

      const playPromise = audio.play();

      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }

      audioRef.current = audio;

      if (
        vibrateEnabled &&
        typeof navigator !== 'undefined' &&
        navigator.vibrate
      ) {
        navigator.vibrate([300, 150, 300]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stopAlarm = () => {
    try {
      if (!audioRef.current) {
        return;
      }

      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } catch (e) {
      console.error(e);
    }
  };

  const switchMode = (selectedMode) => {
    stopAlarm();
    setMessage('');

    const minutes = getMinutes(selectedMode);

    setMode(selectedMode);
    setCustomMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  const applyCustomTime = () => {
    stopAlarm();
    setMessage('');
    if (!customMinutes || customMinutes <= 0) {
      return;
    }

    storage.set(`focus-timer-${mode}`, String(customMinutes));

    setTimeLeft(customMinutes * 60);
    setIsRunning(false);
  };

  const resetMode = () => {
    storage.remove(`focus-timer-${mode}`);

    stopAlarm();
    setMessage('');
    setCustomMinutes(presets[mode]);
    setTimeLeft(presets[mode] * 60);
    setIsRunning(false);
  };

  const formatTime = (seconds) => {
    const rounded = Math.max(0, Math.round(seconds));

    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;

    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentSaved = storage.get(`focus-timer-${mode}`);

  const totalMinutes = currentSaved
    ? Number(currentSaved)
    : presets[mode];

  const progress =
    ((totalMinutes * 60 - timeLeft) / (totalMinutes * 60)) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => {
                stopAlarm();
                const next = !soundEnabled;
                setSoundEnabled(next);
                storage.set('focus-sound', String(next));
              }}
              className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center ${
                soundEnabled
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            <button
              onClick={() => {
                stopAlarm();
                const next = !vibrateEnabled;
                setVibrateEnabled(next);
                storage.set('focus-vibrate', String(next));
              }}
              className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center ${
                vibrateEnabled
                  ? 'bg-violet-500 border-violet-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              📳
            </button>
          </div>

          <label className="h-9 px-3 text-xs rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 transition-all flex items-center cursor-pointer">
            Change Alarm
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                stopAlarm();
                setMessage('');
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                const reader = new FileReader();

                reader.onloadend = () => {
                  if (typeof reader.result !== 'string') {
                    return;
                  }

                  storage.set('focus-audio', reader.result);
                  audioRef.current = new Audio("/alarm.mp3");
                };

                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-center mb-6">
          Focus Timer
        </h1>

        <div className="flex gap-2 mb-5 justify-center flex-wrap">
          {Object.keys(presets).map((preset) => {
            const saved = storage.get(`focus-timer-${preset}`);

            const customized =
              saved !== null && Number(saved) !== presets[preset];

            return (
              <button
                key={preset}
                onClick={() => switchMode(preset)}
                className={`px-4 py-2 rounded-2xl transition-all font-medium flex items-center ${
                  mode === preset
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {preset}

                {customized && (
                  <span className="ml-2 opacity-70 text-xs">●</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mb-8">
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="text-center mb-8">
          {message && (
            <button
              onClick={() => {
                stopAlarm();
                setMessage('');
              }}
              className="mb-5 px-4 py-3 rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-300 transition-all"
            >
              {message}
            </button>
          )}

          <div className="text-7xl font-black tracking-widest tabular-nums">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              stopAlarm();
              setMessage('');
              setIsRunning((prev) => !prev);
            }}
            className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
              isRunning
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : 'bg-white text-black'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>

          <button
            onClick={() => {
              stopAlarm();
              setMessage('');
              setTimeLeft(totalMinutes * 60);
              setIsRunning(false);
            }}
            className="flex-1 bg-zinc-800 py-3 rounded-2xl font-semibold hover:bg-zinc-700 transition-all"
          >
            Restart
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <div className="text-center text-zinc-500 text-sm mb-6">
            Built for focus sessions while working or studying.
          </div>

          <div className="flex gap-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 outline-none"
            />

            <button
              onClick={applyCustomTime}
              className="bg-blue-600 px-5 rounded-2xl font-semibold hover:bg-blue-500 transition-all"
            >
              Apply
            </button>

            <button
              onClick={resetMode}
              className="bg-red-600 px-5 rounded-2xl font-semibold hover:bg-red-500 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
