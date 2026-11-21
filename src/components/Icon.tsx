import {
  Home, ScanFace, Droplets, ListChecks, Dumbbell, GraduationCap, LineChart, MessageSquare, User, Check, Camera, ImageUp,
  Play, ArrowRight, ArrowLeft, Share2, Download, Upload, Paperclip, Send, X, Menu, Flame, Sparkles, Scissors, Moon, Shirt,
  Brain, Smile, Eye, Aperture, Shield, FlaskConical, Compass, PersonStanding, Sun, Trash2, Copy, BookOpen, Video, Swords,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  home: Home, analyze: ScanFace, skin: Droplets, program: ListChecks, trainer: Dumbbell, academy: GraduationCap,
  progress: LineChart, coach: MessageSquare, profile: User, check: Check, camera: Camera, upload: ImageUp, play: Play,
  right: ArrowRight, left: ArrowLeft, share: Share2, download: Download, import: Upload, clip: Paperclip, send: Send,
  x: X, menu: Menu, flame: Flame, sparkles: Sparkles, hair: Scissors, sleep: Moon, style: Shirt, mind: Brain,
  smile: Smile, eye: Eye, photo: Aperture, safety: Shield, science: FlaskConical, base: Compass, body: Dumbbell,
  face: PersonStanding, sun: Sun, trash: Trash2, copy: Copy, book: BookOpen, video: Video, life: Shirt, battle: Swords,
}

export function Icon({ name, size }: { name: string; size?: number }) {
  const C = MAP[name] ?? Sparkles
  return <C className="ico" style={size ? { width: size, height: size } : undefined} aria-hidden />
}
