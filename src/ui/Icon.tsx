import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'search' | 'x' | 'plus' | 'heart' | 'filter' | 'sort' | 'book' | 'user' | 'chart' | 'box'
  | 'back' | 'next' | 'edit' | 'trash' | 'open' | 'sun' | 'moon' | 'auto' | 'check' | 'list' | 'upload' | 'download';

export function Icon({ name, size = 22, color, fill = 'none' }: { name: IconName; size?: number; color: string; fill?: string }) {
  const s = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  let body;
  switch (name) {
    case 'search': body = <><Circle cx={11} cy={11} r={6.5} {...s} strokeWidth={2.2} /><Path d="M16 16l4.5 4.5" {...s} strokeWidth={2.2} /></>; break;
    case 'x': body = <Path d="M6 6l12 12M18 6L6 18" {...s} strokeWidth={2.2} />; break;
    case 'plus': body = <Path d="M12 5v14M5 12h14" {...s} strokeWidth={3} />; break;
    case 'heart': body = <Path d="M12 20s-7.5-4.6-7.5-10.2C4.5 7 6.6 5 9 5c1.4 0 2.4.7 3 1.7C12.6 5.7 13.6 5 15 5c2.4 0 4.5 2 4.5 4.8C19.5 15.4 12 20 12 20z" {...s} fill={fill} />; break;
    case 'filter': body = <Path d="M4 7h16M7 12h10M10 17h4" {...s} strokeWidth={2.2} />; break;
    case 'sort': body = <Path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5" {...s} strokeWidth={2.2} />; break;
    case 'book': body = <Path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5c-.8 0-1.5-.7-1.5-1.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" {...s} />; break;
    case 'user': body = <><Circle cx={12} cy={8.5} r={3.8} {...s} /><Path d="M4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6" {...s} /></>; break;
    case 'chart': body = <Path d="M5 20V12M10 20V6M15 20v-9M20 20V9" {...s} strokeWidth={2.2} />; break;
    case 'box': body = <><Path d="M4 8l8-4 8 4v8l-8 4-8-4z" {...s} /><Path d="M4 8l8 4 8-4M12 12v8" {...s} /></>; break;
    case 'back': body = <Path d="M14.5 6L8.5 12l6 6" {...s} strokeWidth={2.4} />; break;
    case 'next': body = <Path d="M9.5 6l6 6-6 6" {...s} strokeWidth={2.4} />; break;
    case 'list': body = <Path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...s} strokeWidth={2.4} />; break;
    case 'upload': body = <Path d="M12 16V4M7 9l5-5 5 5M5 20h14" {...s} strokeWidth={2.2} />; break;
    case 'download': body = <Path d="M12 4v12M7 11l5 5 5-5M5 20h14" {...s} strokeWidth={2.2} />; break;
    case 'edit': body = <Path d="M4 20h4L19 9l-4-4L4 16z" {...s} />; break;
    case 'trash': body = <Path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" {...s} />; break;
    case 'open': body = <Path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" {...s} strokeWidth={2.2} />; break;
    case 'sun': body = <><Circle cx={12} cy={12} r={4} {...s} /><Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" {...s} /></>; break;
    case 'moon': body = <Path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" {...s} />; break;
    case 'auto': body = <><Circle cx={12} cy={12} r={8} {...s} /><Path d="M12 4a8 8 0 0 1 0 16z" fill={color} /></>; break;
    case 'check': body = <Path d="M5 12.5l4.5 4.5L19 7.5" {...s} strokeWidth={2.6} />; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>;
}
