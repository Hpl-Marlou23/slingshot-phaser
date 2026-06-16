let pendingAudio = false;
let loadComplete = false;
let callbackFired = false;

export function Base64Manager (scene, onCompleteCallback)
{
    pendingAudio = false;
    loadComplete = false;
    callbackFired = false;

    // Guard: on iOS the deferred-decode path causes decodedall to fire after
    // the scene has already transitioned, so prevent double invocation.
    const safeCallback = () => {
        if (!callbackFired) {
            callbackFired = true;
            onCompleteCallback();
        }
    };

    scene.load.on('complete', () => {

        loadComplete = true;

        if (!pendingAudio)
        {
            safeCallback();
        }

    });

    scene.sound.once('decodedall', () => {

        pendingAudio = false;

        if (loadComplete)
        {
            safeCallback();
        }

    });
}

export function IsPendiungAudio ()
{
    return pendingAudio;
}

export function IsLoadComplete ()
{
    return loadComplete;
}

export function SetLoadComplete ()
{
    loadComplete = true;
}

export function SetPendingAudio ()
{
    pendingAudio = true;
}
