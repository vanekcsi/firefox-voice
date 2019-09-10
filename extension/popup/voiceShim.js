/* globals log */

this.voiceShim = (function() {
  const exports = {};

  let activeRecorder;
  let unloadEventAdded = false;

  exports.Recorder = class Recorder {
    constructor() {
      this._cachedVolumeLevel = 0;
      if (activeRecorder) {
        throw new Error("new voiceShim.Recorder() called twice");
      }
      activeRecorder = this;
      browser.runtime.sendMessage({
        type: "voiceShimForward",
        method: "constructor",
      });
      if (!unloadEventAdded) {
        unloadEventAdded = true;
        window.addEventListener("unload", closeOpenRecorder);
      }
    }

    async startRecording() {
      return browser.runtime
        .sendMessage({
          type: "voiceShimForward",
          method: "startRecording",
        })
        .catch(e => {
          log.error("Error starting recording:", String(e));
          throw e;
        });
    }

    stop() {
      return browser.runtime.sendMessage({
        type: "voiceShimForward",
        method: "stop",
      });
    }

    cancel() {
      this.stop();
    }

    onBeginRecording() {
      // override
    }

    onEnd(jsonOrNull) {
      // override
    }

    onError(exception) {
      // override
    }

    getVolumeLevel() {
      browser.runtime
        .sendMessage({
          type: "voiceShimForward",
          method: "getVolumeLevel",
        })
        .then(volume => {
          this._cachedVolumeLevel = volume;
        })
        .catch(error => {
          log.error("Error getting volume level:", error);
        });
      return this._cachedVolumeLevel;
    }
  };

  browser.runtime.onMessage.addListener(async message => {
    if (message.type === "onVoiceShim") {
      if (!activeRecorder) {
        log.error("Received message with no Recorder instance:", message);
        return null;
      }
      const args = message.args || [];
      return activeRecorder[message.method](...args);
    }
    return null;
  });

  exports.openRecordingTab = async function() {
    return browser.runtime.sendMessage({
      type: "openRecordingTab",
    });
  };

  function closeOpenRecorder() {
    if (activeRecorder) {
      activeRecorder.stop();
      activeRecorder = null;
    }
  }

  return exports;
})();
