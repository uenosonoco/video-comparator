import { useState, useEffect, createRef, type RefObject } from "react";
import "./App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStop,
  faBackward,
  faForward,
  faPlay,
  faPause,
  faRecycle,
  faPlus,
  faStopwatch,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { v4 as uuidv4 } from "uuid";

function App() {
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoRefs, setVideoRefs] = useState<RefObject<HTMLVideoElement>[]>([]);
  useEffect(() => {
    setVideoRefs((prev) =>
      Array(videoFiles.length)
        .fill(undefined)
        .map((_, index) => prev[index] ?? createRef<HTMLVideoElement>())
    );
  }, [videoFiles]);
  const [allPaused, setAllPaused] = useState<boolean>(true);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setAllPaused(
        videoRefs.every((ref) => {
          if (!ref.current) return true;
          return ref.current.paused;
        })
      );
    }, 100);
    return () => clearInterval(intervalId);
  }, [videoRefs]);
  const [playbackRate, setPlaybackRate] = useState(1);
  useEffect(() => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.playbackRate = playbackRate;
      }
    });
  }, [playbackRate, videoRefs]);

  const stopAll = () => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
  };

  const addDeltaTimeAll = (delta: number) => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        let newTime = ref.current.currentTime + delta;
        newTime = Math.max(0, Math.min(newTime, ref.current.duration || 0));
        ref.current.currentTime = newTime;
      }
    });
  };

  const playAll = () => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.play();
      }
    });
  };

  const pauseAll = () => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
      }
    });
  };

  const handleFileSelect =
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("video/")) {
        setVideoFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index] = file;
          return newFiles;
        });
      }
    };

  const removeVideo = (index: number) => {
    setVideoFiles((prev) => {
      const newFiles = [...prev];
      delete newFiles[index];
      return newFiles;
    });
  };

  const VideoDropZone = ({ index }: { index: number }) => {
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file && file.type.startsWith("video/")) {
        setVideoFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index] = file;
          return newFiles;
        });
      }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    };

    return (
      <div
        className="drop-zone"
        onClick={() => document.getElementById(`fileInput-${index}`)?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          id={`fileInput-${index}`}
          accept="video/*"
          onChange={handleFileSelect(index)}
          style={{ display: "none" }}
        />
        <p>ここをタップまたはドラッグ&ドロップで動画を選ぶ。</p>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="videos-container">
        {[0, 1].map((index) =>
          !videoFiles[index] ? (
            <VideoDropZone key={index} index={index} />
          ) : (
            <VideoPlayer
              key={index}
              file={videoFiles[index]}
              videoRef={videoRefs[index]}
              onRemove={() => removeVideo(index)}
            />
          )
        )}
      </div>
      <div className="bottom-container">
        <div className="controls">
          <div className="button-group">
            <button onClick={stopAll}>
              <FontAwesomeIcon icon={faStop} />
            </button>
            <button onClick={() => addDeltaTimeAll(-1)}>
              <FontAwesomeIcon icon={faBackward} />
              <span className="icon-label">1</span>
            </button>
            <button onClick={() => addDeltaTimeAll(-0.1)}>
              <FontAwesomeIcon icon={faBackward} />
              <span className="icon-label">0.1</span>
            </button>
            <button onClick={() => addDeltaTimeAll(-0.01)}>
              <FontAwesomeIcon icon={faBackward} />
              <span className="icon-label">0.01</span>
            </button>
            {allPaused ? (
              <button onClick={playAll}>
                <FontAwesomeIcon icon={faPlay} />
              </button>
            ) : (
              <button onClick={pauseAll}>
                <FontAwesomeIcon icon={faPause} />
              </button>
            )}
            <button onClick={() => addDeltaTimeAll(0.01)}>
              <FontAwesomeIcon icon={faForward} />
              <span className="icon-label">0.01</span>
            </button>
            <button onClick={() => addDeltaTimeAll(0.1)}>
              <FontAwesomeIcon icon={faForward} />
              <span className="icon-label">0.1</span>
            </button>
            <button onClick={() => addDeltaTimeAll(1)}>
              <FontAwesomeIcon icon={faForward} />
              <span className="icon-label">1</span>
            </button>
            <select
              className="playback-rate-select"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              title="再生速度"
            >
              <option value={0.1}>x0.1</option>
              <option value={0.5}>x0.5</option>
              <option value={1}>x1</option>
              <option value={1.5}>x1.5</option>
              <option value={2}>x2</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({
  file,
  videoRef,
  onRemove,
}: {
  file: File;
  videoRef: React.RefObject<HTMLVideoElement> | undefined;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [marks, setMarks] = useState<{ id: string; time: number }[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (videoRef?.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [videoRef]);

  useEffect(() => {
    if (!selectedMarkId) return;
    const selectedMark = marks.find((m) => m.id === selectedMarkId);
    if (!selectedMark) {
      setSelectedMarkId(null);
      return;
    }
    if (Math.abs(currentTime - selectedMark.time) > 0.01) {
      setSelectedMarkId(null);
    }
  }, [currentTime, selectedMarkId, marks]);

  const handleLoadedMetadata = () => {
    if (videoRef?.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds
      .toString()
      .padStart(2, "0")}`;
  };

  const setTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef?.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const stop = () => {
    if (videoRef?.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const addDeltaTime = (delta: number) => {
    if (videoRef?.current) {
      let newTime = videoRef.current.currentTime + delta;
      newTime = Math.max(0, Math.min(newTime, duration));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const play = () => {
    if (videoRef?.current) {
      videoRef.current.play();
    }
  };

  const pause = () => {
    if (videoRef?.current) {
      videoRef.current.pause();
    }
  };

  const markCurrentTime = () => {
    setMarks((prev) => {
      if (prev.some((m) => Math.abs(m.time - currentTime) < 0.01)) return prev;
      return [...prev, { id: uuidv4(), time: currentTime }].sort(
        (a, b) => a.time - b.time
      );
    });
  };

  const jumpToMark = (id: string, time: number) => {
    if (videoRef?.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      setSelectedMarkId(id);
      videoRef.current.pause();
    }
  };

  const getDiff = (index: number) => {
    if (index === 0) return "";
    const diff = marks[index].time - marks[index - 1].time;
    return ` (+${diff.toFixed(2)})`;
  };

  const removeSelectedMark = () => {
    if (!selectedMarkId) return;
    setMarks((prev) => prev.filter((m) => m.id !== selectedMarkId));
    setSelectedMarkId(null);
  };

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={src}
        style={{ width: "100%" }}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <div className="controls">
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span> / </span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="seek-bar-wrapper">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={setTime}
            className="seek-bar"
          />
        </div>
        <div className="button-group">
          <button
            onClick={() => {
              if (window.confirm("動画を選びなおします。よろしいですか？")) {
                onRemove();
              }
            }}
            title="動画を選択"
          >
            <FontAwesomeIcon icon={faRecycle} />
          </button>
          <button onClick={stop}>
            <FontAwesomeIcon icon={faStop} />
          </button>
          <button onClick={() => addDeltaTime(-1)}>
            <FontAwesomeIcon icon={faBackward} />
            <span className="icon-label">1</span>
          </button>
          <button onClick={() => addDeltaTime(-0.1)}>
            <FontAwesomeIcon icon={faBackward} />
            <span className="icon-label">0.1</span>
          </button>
          <button onClick={() => addDeltaTime(-0.01)}>
            <FontAwesomeIcon icon={faBackward} />
            <span className="icon-label">0.01</span>
          </button>
          {videoRef?.current?.paused ? (
            <button onClick={play}>
              <FontAwesomeIcon icon={faPlay} />
            </button>
          ) : (
            <button onClick={pause}>
              <FontAwesomeIcon icon={faPause} />
            </button>
          )}
          <button onClick={() => addDeltaTime(0.01)}>
            <FontAwesomeIcon icon={faForward} />
            <span className="icon-label">0.01</span>
          </button>
          <button onClick={() => addDeltaTime(0.1)}>
            <FontAwesomeIcon icon={faForward} />
            <span className="icon-label">0.1</span>
          </button>
          <button onClick={() => addDeltaTime(1)}>
            <FontAwesomeIcon icon={faForward} />
            <span className="icon-label">1</span>
          </button>
        </div>
        <div className="button-group">
          <button onClick={markCurrentTime} title="時点を記録">
            <FontAwesomeIcon icon={faPlus} />
            <FontAwesomeIcon icon={faStopwatch} />
          </button>
          <button
            onClick={removeSelectedMark}
            disabled={!selectedMarkId}
            style={{ opacity: selectedMarkId ? 1 : 0.5 }}
            title="選択した時点を消す"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
          {marks.map((mark, idx) => (
            <button
              key={mark.id}
              onClick={() => jumpToMark(mark.id, mark.time)}
              style={{
                border:
                  mark.id === selectedMarkId ? "2px solid #f39c12" : undefined,
                background: mark.id === selectedMarkId ? "#fffbe6" : undefined,
                position: "relative",
              }}
            >
              {mark.id === selectedMarkId && (
                <span
                  style={{
                    color: "#f39c12",
                    fontWeight: "bold",
                    marginRight: 4,
                  }}
                >
                  ★
                </span>
              )}
              {formatTime(mark.time)}
              {getDiff(idx)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
