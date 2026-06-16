function IsBase64 (str)
{
    return /^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+)?;base64,/.test(str);
}

function Base64ToBlob (base64String, mimeType = 'video/mp4')
{
    const bstr = atob(base64String.split(',')[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);

    for (let i = 0; i < n; i++)
    {
        u8arr[i] = bstr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: mimeType });
}

export function LoadBase64Video (scene, key, base64String, mimeType = 'video/mp4')
{
    if (IsBase64(base64String))
    {
        const blob = Base64ToBlob(base64String, mimeType);
        const url = URL.createObjectURL(blob);
        scene.load.video(key, url);
    }
    else
    {
        scene.load.video(key, base64String);
    }
}
