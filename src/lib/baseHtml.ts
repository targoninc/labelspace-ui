export async function baseHtml(req: Request) {
    return `<!DOCTYPE html>
<html lang="en">
<head id="header">
    <title>Tri Artist Space</title>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Tri Artist Space">
    <meta name="theme-color" content="#2e3192">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    
    <!-- IBM Plex Mono -->
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
    
    <!-- Material Symbols Filled -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/targoninc/jess-components@0.0.15/src/src/jess-components.css"/>
    
    <link rel="stylesheet" type="text/css" href="/styles/style.css"/>
    <link rel="apple-touch-icon" href="/images/LOGO128.png">
    <link rel="icon" href="/images/LOGO.svg" sizes="128x128">

    <meta property="og:type" content="website"/>
    <meta property="og:title" content="Tri Artist Space"/>
    <meta property="og:description" content="Insights and tools for artists."/>
    <script src="/main.js" type="module"></script>
</head>
<body>
<div id="content"></div>
<div id="notifications"></div>
<div id="modals"></div>
</body>
</html>`;
}