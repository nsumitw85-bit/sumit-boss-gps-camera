import { LocationData, AddressData, OverlayLayout, WardMatchResult } from '../types';
import { formatTime12Hour, formatDateString } from '../utils/timeFormat';

export interface StampOptions {
  baseImage: HTMLImageElement | HTMLCanvasElement;
  location: LocationData;
  address: AddressData;
  workerName?: string;
  workCategoryName?: string;
  wardNumber?: string;
  wardMatchResult?: WardMatchResult;
  compassHeading?: number | null;
  compassDirection?: string | null;
  area?: string;
  notes?: string;
  layout: OverlayLayout;
  showMiniMap?: boolean;
  quality?: number;
  googleMapsApiKey?: string;
}

export class PhotoStamper {
  /**
   * Helper to load an image with timeout for map preview
   */
  private static async loadMapTileImage(url: string, timeoutMs = 2500): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        img.src = '';
        resolve(null);
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = url;
    });
  }

  /**
   * Stamps GPS and worker metadata directly into the image canvas and returns high-resolution JPEG
   */
  static async renderStamp(options: StampOptions): Promise<{ stampedDataUrl: string; thumbnailDataUrl: string }> {
    const {
      baseImage,
      location,
      address,
      workerName,
      workCategoryName,
      wardNumber,
      wardMatchResult,
      compassHeading,
      compassDirection,
      area,
      notes,
      layout,
      showMiniMap = true,
      quality = 0.92,
      googleMapsApiKey,
    } = options;

    const width = 'videoWidth' in baseImage ? (baseImage as any).videoWidth || 1280 : baseImage.width || 1280;
    const height = 'videoHeight' in baseImage ? (baseImage as any).videoHeight || 720 : baseImage.height || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }

    // 1. Draw base photo without distortion or unnecessary cropping
    ctx.drawImage(baseImage, 0, 0, width, height);

    // Format Date & Time in 12-hour format with AM/PM
    const now = new Date(location.timestamp || Date.now());
    const dateStr = formatDateString(now);
    const timeStr = formatTime12Hour(now);

    // Try fetching map tile asynchronously if mini-map is enabled
    let mapImage: HTMLImageElement | null = null;
    if (showMiniMap && location.latitude && location.longitude && location.status === 'current') {
      try {
        let mapUrl = '';
        if (googleMapsApiKey) {
          mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=16&size=300x300&markers=color:red%7C${location.latitude},${location.longitude}&key=${googleMapsApiKey}`;
        } else {
          // OpenStreetMap Slippy Map Tile
          const zoom = 16;
          const n = Math.pow(2, zoom);
          const tileX = Math.floor(((location.longitude + 180) / 360) * n);
          const latRad = (location.latitude * Math.PI) / 180;
          const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
          mapUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
        }
        mapImage = await this.loadMapTileImage(mapUrl);
      } catch {
        mapImage = null;
      }
    }

    const payload = {
      location,
      address,
      workerName,
      workCategoryName,
      wardNumber: wardNumber || wardMatchResult?.wardNumber || 'Ward Not Identified',
      wardMatchResult,
      compassHeading,
      compassDirection: compassDirection || location.compassDirection || 'Direction unavailable',
      area,
      notes,
      dateStr,
      timeStr,
      showMiniMap,
      mapImage,
    };

    // Render redesign panel
    switch (layout) {
      case 'modern_card':
        this.renderModernCard(ctx, width, height, payload);
        break;
      case 'sidebar_compact':
        this.renderSidebarCompact(ctx, width, height, payload);
        break;
      case 'full_inspector':
        this.renderFullInspector(ctx, width, height, payload);
        break;
      case 'classic_bottom':
      default:
        // Default: Professional Bottom GPS Information Panel (18% - 25% of photo height)
        this.renderRedesignedBottomPanel(ctx, width, height, payload);
        break;
    }

    const stampedDataUrl = canvas.toDataURL('image/jpeg', quality);

    // Generate fast thumbnail (max 420px width)
    const thumbWidth = 420;
    const thumbHeight = Math.round((height / width) * thumbWidth);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
    }
    const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);

    return { stampedDataUrl, thumbnailDataUrl };
  }

  /**
   * --- 1. HIGH-RESOLUTION EXPANDED GPS INFORMATION PANEL ---
   * Fully responsive to captured photograph dimensions (1080p, 4K, landscape and portrait).
   * - Height: 26% - 32% of image height to prevent text compression
   * - Deep obsidian/navy background (#030712 / rgba(3, 7, 18, 0.96)) with high contrast
   * - Generous typography for Lat/Long, address, postal PIN, date/time, accuracy, worker & ward
   * - Complete address wrapped across multiple lines without truncating
   * - Sharp fonts, proper line-height, and full Marathi / Hindi / English Unicode font fallbacks
   */
  private static renderRedesignedBottomPanel(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: any
  ) {
    const isPortrait = h > w;
    // Expanded panel height: 26% in landscape, 28-32% in portrait, with generous minimums
    const minHeight = isPortrait ? 380 : 250;
    const heightPercent = isPortrait ? 0.29 : 0.25;
    const panelHeight = Math.max(Math.round(h * heightPercent), minHeight);
    const startY = h - panelHeight;

    // Responsive scaling based on output image resolution (normalized for ultra-sharp readability)
    // 1920x1080 -> scale ~1.3; 4K (3840x2160) -> scale ~2.5; 1280x720 -> scale 1.0
    const refDimension = isPortrait ? w : Math.min(w, h * 1.77);
    const scale = Math.max(refDimension / 1100, 1.0);

    // Deep high-contrast background with subtle solid gradient
    const bgGrad = ctx.createLinearGradient(0, startY, 0, h);
    bgGrad.addColorStop(0, 'rgba(4, 9, 20, 0.98)');
    bgGrad.addColorStop(0.3, 'rgba(6, 14, 30, 0.98)');
    bgGrad.addColorStop(1, 'rgba(3, 7, 18, 1.0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, startY, w, panelHeight);

    // Prominent Top Accent Divider Line (Blue to Sky Blue)
    const accentGrad = ctx.createLinearGradient(0, startY, w, startY);
    accentGrad.addColorStop(0, '#1d4ed8');
    accentGrad.addColorStop(0.35, '#38bdf8');
    accentGrad.addColorStop(0.7, '#60a5fa');
    accentGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, startY, w, Math.max(Math.round(4.5 * scale), 4));

    const pad = Math.round(18 * scale);
    const innerTop = startY + Math.round(12 * scale);
    const innerHeight = panelHeight - Math.round(20 * scale);

    if (isPortrait) {
      // --- PORTRAIT LAYOUT: Clean 2-Tier Stack with Map Preview & Dual Columns ---
      this.renderPortraitLayout(ctx, 0, startY, w, panelHeight, pad, innerTop, innerHeight, scale, data);
    } else {
      // --- LANDSCAPE LAYOUT: 3 Clear Columns (Map, Address, Telemetry) ---
      this.renderLandscapeLayout(ctx, 0, startY, w, panelHeight, pad, innerTop, innerHeight, scale, data);
    }
  }

  /**
   * Landscape Layout: 3 Columns (Map Preview, Middle Address & Coordinates, Right Telemetry & Worker)
   */
  private static renderLandscapeLayout(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    w: number,
    panelHeight: number,
    pad: number,
    innerTop: number,
    innerHeight: number,
    scale: number,
    data: any
  ) {
    // Column 1: Map Preview (approx 20% width)
    const mapBoxWidth = Math.max(Math.round(w * 0.19), Math.round(180 * scale));
    const mapBoxHeight = innerHeight - Math.round(6 * scale);
    const mapBoxX = pad;
    const mapBoxY = innerTop + Math.round(2 * scale);

    this.drawMapPreview(ctx, mapBoxX, mapBoxY, mapBoxWidth, mapBoxHeight, scale, data.location, data.mapImage);

    // Column 3: Right Column (Telemetry, Worker, Ward, Branding)
    const rightColWidth = Math.max(Math.round(w * 0.35), Math.round(330 * scale));
    const rightX = w - rightColWidth - pad;

    // Column 2: Middle Information Column (Coordinates, Full Address, Locality)
    const midX = mapBoxX + mapBoxWidth + Math.round(18 * scale);
    const midWidth = rightX - midX - Math.round(18 * scale);

    this.drawMiddleAddressSection(ctx, midX, innerTop, midWidth, innerHeight, scale, data);
    this.drawRightTelemetrySection(ctx, rightX, innerTop, rightColWidth, innerHeight, scale, data);
  }

  /**
   * Portrait Layout: Optimized for vertical phone captures so all details remain huge & readable
   */
  private static renderPortraitLayout(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    w: number,
    panelHeight: number,
    pad: number,
    innerTop: number,
    innerHeight: number,
    scale: number,
    data: any
  ) {
    // Top Row of Panel: Mini Map on left, Coordinates & Branding on right
    const topRowH = Math.round(innerHeight * 0.42);
    const mapWidth = Math.min(Math.round(topRowH * 1.3), Math.round(w * 0.3));
    const mapX = pad;
    const mapY = innerTop;

    this.drawMapPreview(ctx, mapX, mapY, mapWidth, topRowH, scale * 0.9, data.location, data.mapImage);

    // Right of map: Lat/Long + Branding + Date/Time
    const topInfoX = mapX + mapWidth + Math.round(14 * scale);
    const topInfoW = w - topInfoX - pad;

    let curY = mapY + Math.round(18 * scale);

    // Branding
    ctx.font = `800 ${Math.round(19 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SUMIT BOSS', topInfoX, curY);

    ctx.font = `700 ${Math.round(12 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('• GPS MAP CAMERA', topInfoX + ctx.measureText('SUMIT BOSS ').width + 4 * scale, curY);

    curY += Math.round(24 * scale);

    // Coordinates (Emerald green, large and clear)
    ctx.font = `800 ${Math.round(15 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`Lat: ${data.location.latitude.toFixed(6)}`, topInfoX, curY);
    curY += Math.round(20 * scale);
    ctx.fillText(`Long: ${data.location.longitude.toFixed(6)}`, topInfoX, curY);

    curY += Math.round(22 * scale);

    // Date/Time & Heading
    ctx.font = `700 ${Math.round(13 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${data.dateStr}  ${data.timeStr} • ${data.compassDirection}`, topInfoX, curY);

    // Bottom Row of Panel: Address on Left, Worker & Ward on Right
    const bottomRowY = mapY + topRowH + Math.round(14 * scale);
    const bottomRowH = innerHeight - topRowH - Math.round(14 * scale);

    // Divider Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, bottomRowY - Math.round(6 * scale));
    ctx.lineTo(w - pad, bottomRowY - Math.round(6 * scale));
    ctx.stroke();

    const col1W = Math.round((w - pad * 2 - Math.round(16 * scale)) * 0.58);
    const col2X = pad + col1W + Math.round(16 * scale);
    const col2W = w - col2X - pad;

    // Address in col 1
    this.drawAddressBlock(ctx, pad, bottomRowY, col1W, bottomRowH, scale, data);

    // Worker, Work, Ward, Accuracy in col 2
    this.drawWorkerAndWardBlock(ctx, col2X, bottomRowY, col2W, bottomRowH, scale, data);
  }

  /**
   * Renders the location map preview on the bottom-left with real tiles or clean fallback
   */
  private static drawMapPreview(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    loc: LocationData,
    mapImg: HTMLImageElement | null
  ) {
    ctx.save();
    // Clip rounded container
    this.roundRect(ctx, x, y, w, h, Math.round(10 * scale), '#0b1933', '#1e3a8a', Math.round(2 * scale));
    ctx.clip();

    if (mapImg && mapImg.complete && mapImg.naturalWidth > 0) {
      // Draw actual map tile image
      ctx.drawImage(mapImg, x, y, w, h);
    } else {
      // Clean high-contrast fallback vector map preview
      ctx.fillStyle = '#0a1528';
      ctx.fillRect(x, y, w, h);

      // Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (w / 5) * i, y);
        ctx.lineTo(x + (w / 5) * i, y + h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + (h / 4) * i);
        ctx.lineTo(x + w, y + (h / 4) * i);
        ctx.stroke();
      }

      // Compass Ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center Location Pin Marker
    const cx = x + w / 2;
    const cy = y + h / 2;

    // Pin pulse circle
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy - 6 * scale, 14 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Red location marker icon
    ctx.fillStyle = '#ef4444'; // Bright Red Pin
    ctx.beginPath();
    ctx.arc(cx, cy - 8 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Pin tip
    ctx.beginPath();
    ctx.moveTo(cx - 6 * scale, cy - 6 * scale);
    ctx.lineTo(cx, cy + 3 * scale);
    ctx.lineTo(cx + 6 * scale, cy - 6 * scale);
    ctx.closePath();
    ctx.fill();

    // Pin center white dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy - 8 * scale, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Bottom Badge on map preview
    const badgeH = Math.round(22 * scale);
    ctx.fillStyle = 'rgba(3, 7, 18, 0.9)';
    ctx.fillRect(x, y + h - badgeH, w, badgeH);
    ctx.font = `800 ${Math.round(10 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('MAP PREVIEW', cx, y + h - Math.round(7 * scale));
    ctx.textAlign = 'start';

    ctx.restore();
  }

  /**
   * Renders the middle section containing complete address, coordinates, and locality in Landscape mode
   */
  private static drawMiddleAddressSection(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    data: any
  ) {
    let curY = y + Math.round(18 * scale);

    // Coordinates Row: Lat and Long (bold and readable emerald)
    ctx.font = `800 ${Math.round(16 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#4ade80';
    const latStr = `Lat: ${data.location.latitude.toFixed(6)}`;
    const lonStr = `Long: ${data.location.longitude.toFixed(6)}`;
    ctx.fillText(`${latStr}   ${lonStr}`, x, curY);

    curY += Math.round(22 * scale);

    // Address Header Label
    ctx.font = `700 ${Math.round(12 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('LOCATION & COMPLETE ADDRESS:', x, curY);

    curY += Math.round(18 * scale);

    // Complete Formatted Address with support for Marathi / Hindi / English
    // Generous font size (15px scaled) and line height (22px scaled)
    ctx.font = `600 ${Math.round(14.5 * scale)}px "Plus Jakarta Sans", "Noto Sans Devanagari", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';

    const fullAddr = data.address.fullAddress || 'Location address unverified';
    const lines = this.wrapText(ctx, fullAddr, w);

    // Display all available address lines cleanly
    const maxLines = 4;
    const linesToShow = lines.slice(0, maxLines);
    const lineSpacing = Math.round(21 * scale);

    linesToShow.forEach((line: string) => {
      ctx.fillText(line, x, curY);
      curY += lineSpacing;
    });

    curY += Math.round(4 * scale);

    // Administrative sub-row: Taluka, District, PIN Code (Highlighted)
    ctx.font = `700 ${Math.round(13 * scale)}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
    ctx.fillStyle = '#cbd5e1';

    const parts: string[] = [];
    if (data.address.taluka) parts.push(`Taluka: ${data.address.taluka}`);
    if (data.address.district) parts.push(`District: ${data.address.district}`);
    
    // Postal PIN code prominently displayed
    const pinStr = data.address.pinCode ? `PIN: ${data.address.pinCode}` : 'PIN: Unavailable';
    parts.push(pinStr);

    const adminDetails = parts.join('  •  ');
    if (adminDetails) {
      // Draw highlighted admin row
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(adminDetails, x, curY);
    }
  }

  /**
   * Address block for portrait layout
   */
  private static drawAddressBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    data: any
  ) {
    let curY = y + Math.round(14 * scale);

    ctx.font = `700 ${Math.round(12 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('LOCATION & ADDRESS:', x, curY);

    curY += Math.round(18 * scale);

    ctx.font = `600 ${Math.round(13.5 * scale)}px "Plus Jakarta Sans", "Noto Sans Devanagari", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';

    const fullAddr = data.address.fullAddress || 'Location address unverified';
    const lines = this.wrapText(ctx, fullAddr, w);
    const lineSpacing = Math.round(20 * scale);

    lines.slice(0, 4).forEach((line: string) => {
      ctx.fillText(line, x, curY);
      curY += lineSpacing;
    });

    curY += Math.round(4 * scale);

    const pinStr = data.address.pinCode ? `PIN: ${data.address.pinCode}` : 'PIN: Unavailable';
    ctx.font = `800 ${Math.round(13 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(pinStr, x, curY);
  }

  /**
   * Worker & Ward block for portrait layout
   */
  private static drawWorkerAndWardBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    data: any
  ) {
    let curY = y + Math.round(14 * scale);
    const lineSpacing = Math.round(22 * scale);

    this.drawInlineKeyVal(ctx, 'WORKER:', data.workerName || 'Not Assigned', x, curY, scale, '#facc15');
    curY += lineSpacing;

    this.drawInlineKeyVal(ctx, 'WORK:', data.workCategoryName || 'General Maintenance', x, curY, scale, '#38bdf8');
    curY += lineSpacing;

    const wardVal = data.wardNumber || 'Ward Not Identified';
    const wardColor = data.wardMatchResult?.status === 'boundary_warning' ? '#f59e0b' : (wardVal === 'Ward Not Identified' || wardVal === 'Ward not identified') ? '#f87171' : '#ffffff';
    this.drawInlineKeyVal(ctx, 'WARD:', wardVal, x, curY, scale, wardColor);
    curY += lineSpacing;

    const acc = data.location.accuracy ? `±${data.location.accuracy}m` : 'Unavailable';
    this.drawInlineKeyVal(ctx, 'ACCURACY:', acc, x, curY, scale, data.location.accuracy <= 20 ? '#4ade80' : '#f87171');
  }

  /**
   * Renders the right telemetry section in Landscape mode: Date/Time, Heading, Accuracy, Status, Worker & Ward
   */
  private static drawRightTelemetrySection(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    data: any
  ) {
    let curY = y + Math.round(18 * scale);

    // Sumit Boss Branding Badge & Status
    ctx.font = `800 ${Math.round(18 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SUMIT BOSS', x, curY);

    // Pro GPS tag
    const brandW = ctx.measureText('SUMIT BOSS').width;
    ctx.font = `700 ${Math.round(11 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('• GPS MAP CAMERA', x + brandW + 8 * scale, curY);

    curY += Math.round(24 * scale);

    // Date, Time & Compass Direction (large JetBrains Mono font)
    ctx.font = `700 ${Math.round(14 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#f8fafc';
    const timeDisplay = `${data.dateStr}  ${data.timeStr}`;
    ctx.fillText(timeDisplay, x, curY);

    // Direction / Bearing
    const timeW = ctx.measureText(timeDisplay).width;
    ctx.font = `700 ${Math.round(13.5 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`• ${data.compassDirection}`, x + timeW + 8 * scale, curY);

    curY += Math.round(24 * scale);

    // GPS Status Indicator & Accuracy Box
    const acc = data.location.accuracy ? `±${data.location.accuracy} meters` : 'Unavailable';
    const statusText = data.location.gpsStatusText || (data.location.accuracy <= 20 ? 'GPS FIX ACQUIRED' : 'LOW GPS ACCURACY');

    let statusBg = '#065f46'; // Emerald
    let statusTextColor = '#34d399';
    if (statusText === 'LOW GPS ACCURACY') {
      statusBg = '#7c2d12'; // Amber/Red
      statusTextColor = '#f87171';
    } else if (statusText === 'WAITING FOR GPS') {
      statusBg = '#78350f';
      statusTextColor = '#fbbf24';
    }

    const badgeWidth = Math.min(180 * scale, w * 0.52);
    const badgeHeight = 22 * scale;
    this.roundRect(ctx, x, curY - 14 * scale, badgeWidth, badgeHeight, 5 * scale, statusBg);
    ctx.font = `800 ${Math.round(10.5 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = statusTextColor;
    ctx.fillText(statusText, x + 8 * scale, curY + 2 * scale);

    // GPS Accuracy
    ctx.font = `700 ${Math.round(12 * scale)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#94a3b8';
    const accStartX = x + badgeWidth + 10 * scale;
    ctx.fillText(`Accuracy: `, accStartX, curY + 2 * scale);
    ctx.fillStyle = data.location.accuracy <= 20 ? '#4ade80' : '#f87171';
    ctx.fillText(acc, accStartX + ctx.measureText('Accuracy: ').width, curY + 2 * scale);

    curY += Math.round(26 * scale);

    // Worker, Work Category & Ward Rows with generous line spacing
    const lineSpacing = Math.round(21 * scale);

    this.drawInlineKeyVal(ctx, 'WORKER:', data.workerName || 'Not Assigned', x, curY, scale, '#facc15');
    curY += lineSpacing;

    this.drawInlineKeyVal(ctx, 'WORK TYPE:', data.workCategoryName || 'General Maintenance', x, curY, scale, '#38bdf8');
    curY += lineSpacing;

    // Ward Number (Verified or boundary warning)
    const wardVal = data.wardNumber || 'Ward Not Identified';
    const wardColor = data.wardMatchResult?.status === 'boundary_warning' ? '#f59e0b' : (wardVal === 'Ward Not Identified' || wardVal === 'Ward not identified') ? '#f87171' : '#ffffff';
    this.drawInlineKeyVal(ctx, 'WARD NUMBER:', wardVal, x, curY, scale, wardColor);
  }

  private static drawInlineKeyVal(
    ctx: CanvasRenderingContext2D,
    key: string,
    val: string,
    x: number,
    y: number,
    scale: number,
    valColor: string = '#ffffff'
  ) {
    ctx.font = `700 ${Math.round(12.5 * scale)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(key, x, y);

    const keyW = ctx.measureText(key).width + 8 * scale;
    ctx.font = `700 ${Math.round(13.5 * scale)}px "Plus Jakarta Sans", "Noto Sans Devanagari", system-ui, sans-serif`;
    ctx.fillStyle = valColor;
    ctx.fillText(val, x + keyW, y);
  }

  // Modern Card, Sidebar Compact, and Full Inspector all utilize the verified high-contrast panel
  private static renderModernCard(ctx: CanvasRenderingContext2D, w: number, h: number, data: any) {
    this.renderRedesignedBottomPanel(ctx, w, h, data);
  }

  private static renderSidebarCompact(ctx: CanvasRenderingContext2D, w: number, h: number, data: any) {
    this.renderRedesignedBottomPanel(ctx, w, h, data);
  }

  private static renderFullInspector(ctx: CanvasRenderingContext2D, w: number, h: number, data: any) {
    this.renderRedesignedBottomPanel(ctx, w, h, data);
  }

  // --- HELPER GRAPHICS ---
  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke?: string,
    strokeWidth?: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();

    if (stroke && strokeWidth) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  private static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
}
