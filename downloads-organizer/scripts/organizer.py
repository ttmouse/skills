#!/usr/bin/env python3
"""Downloads Organizer Script - Organize and clean up downloads folder."""

import os
import sys
import shutil
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List
from collections import defaultdict

class Logger:
    def info(self, msg): print(f"[INFO] {msg}")
    def success(self, msg): print(f"[✓] {msg}")
    def warning(self, msg): print(f"[!] {msg}")
    def error(self, msg): print(f"[✗] {msg}")
    def section(self, msg, char='=', width=60): 
        print(f"\n{char * width}\n{msg}\n{char * width}")

# File type categories
FILE_CATEGORIES = {
    'Documents': {
        'extensions': ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf',
                       '.xls', '.xlsx', '.csv', '.json', '.yaml', '.yml'],
        'folder': 'Documents'
    },
    'Images': {
        'extensions': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
                       '.bmp', '.tiff', '.ico'],
        'folder': 'Images'
    },
    'Videos': {
        'extensions': ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'],
        'folder': 'Videos'
    },
    'Audio': {
        'extensions': ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'],
        'folder': 'Audio'
    },
    'Installers': {
        'extensions': ['.dmg', '.pkg', '.app', '.zip', '.tar.gz', '.rar'],
        'folder': 'Installers'
    },
}

class DownloadsOrganizer:
    def __init__(self, downloads_dir: str = None, logger: Logger = None):
        self.downloads_dir = Path(downloads_dir or os.path.expanduser("~/Downloads"))
        self.logger = logger or Logger()
        
        if not self.downloads_dir.exists():
            self.logger.error(f"Downloads directory not found: {self.downloads_dir}")
            sys.exit(1)
    
    def analyze(self) -> Dict:
        """Analyze downloads folder."""
        self.logger.section("DOWNLOADS FOLDER ANALYSIS")
        
        stats = {
            'total_size': 0,
            'total_files': 0,
            'total_folders': 0,
            'by_category': defaultdict(lambda: {'count': 0, 'size': 0}),
            'large_files': []
        }
        
        for item in self.downloads_dir.rglob('*'):
            if item.is_file():
                size = item.stat().st_size
                stats['total_size'] += size
                stats['total_files'] += 1
                
                category = self._get_category(item)
                if category:
                    stats['by_category'][category]['count'] += 1
                    stats['by_category'][category]['size'] += size
                
                if size > 100 * 1024 * 1024:
                    stats['large_files'].append({
                        'path': str(item.relative_to(self.downloads_dir)),
                        'size': size,
                        'size_mb': size / (1024 * 1024)
                    })
            elif item.is_dir():
                stats['total_folders'] += 1
        
        self._display_analysis(stats)
        return stats
    
    def organize(self, dry_run: bool = False) -> List[Dict]:
        """Organize files into categories."""
        self.logger.section("ORGANIZING FILES")
        
        moves = []
        root_files = [f for f in self.downloads_dir.iterdir() if f.is_file()]
        
        self.logger.info(f"Found {len(root_files)} files in root directory")
        
        for file_path in root_files:
            category = self._get_category(file_path)
            
            if category:
                category_info = FILE_CATEGORIES[category]
                dest_dir = self.downloads_dir / category_info['folder']
                dest_path = dest_dir / file_path.name
                
                if dest_path.exists():
                    self.logger.warning(f"Skipping {file_path.name} - already exists")
                    continue
                
                moves.append({
                    'source': file_path,
                    'dest': dest_path,
                    'category': category,
                    'size': file_path.stat().st_size
                })
        
        if dry_run:
            self._preview_moves(moves)
        else:
            self._execute_moves(moves)
        
        return moves
    
    def _get_category(self, file_path: Path) -> str:
        """Determine file category."""
        ext = file_path.suffix.lower()
        for category, info in FILE_CATEGORIES.items():
            if ext in info['extensions']:
                return category
        return None
    
    def _display_analysis(self, stats: Dict):
        """Display analysis."""
        self.logger.info(f"Location: {self.downloads_dir}")
        self.logger.info(f"Total Size: {self._format_size(stats['total_size'])}")
        self.logger.info(f"Total Files: {stats['total_files']}")
        
        print("\n📊 File Distribution:")
        for category, data in sorted(stats['by_category'].items(),
                                   key=lambda x: x[1]['size'],
                                   reverse=True):
            print(f"  {category:15s} {data['count']:4d} files {self._format_size(data['size']):>10s}")
    
    def _preview_moves(self, moves: List[Dict]):
        """Preview moves."""
        self.logger.info(f"Preview: Would move {len(moves)} files")
        
        for category in FILE_CATEGORIES.keys():
            category_moves = [m for m in moves if m['category'] == category]
            if category_moves:
                total_size = sum(m['size'] for m in category_moves)
                print(f"\n{category} ({len(category_moves)} files, {self._format_size(total_size)}):")
                for move in category_moves[:5]:
                    print(f"  - {move['source'].name}")
    
    def _execute_moves(self, moves: List[Dict]):
        """Execute moves."""
        self.logger.info(f"Moving {len(moves)} files...")
        
        moved_count = 0
        total_size = 0
        
        for move in moves:
            try:
                move['dest'].parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(move['source']), str(move['dest']))
                moved_count += 1
                total_size += move['size']
                self.logger.success(f"Moved: {move['source'].name} → {move['category']}/")
            except Exception as e:
                self.logger.error(f"Failed to move {move['source'].name}: {e}")
        
        self.logger.success(f"\nMoved {moved_count} files ({self._format_size(total_size)})")
    
    def _format_size(self, bytes_size: int) -> str:
        """Format size."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_size < 1024.0:
                return f"{bytes_size:.1f} {unit}"
            bytes_size /= 1024.0
        return f"{bytes_size:.1f} TB"


def main():
    parser = argparse.ArgumentParser(description="Organize downloads folder")
    parser.add_argument('--analyze', action='store_true', help='Analyze downloads folder')
    parser.add_argument('--organize', action='store_true', help='Organize files')
    parser.add_argument('--dry-run', action='store_true', help='Preview without executing')
    
    args = parser.parse_args()
    logger = Logger()
    organizer = DownloadsOrganizer(logger=logger)
    
    if args.analyze:
        organizer.analyze()
    elif args.organize:
        organizer.organize(dry_run=args.dry_run)
    else:
        logger.warning("Use --analyze or --organize")


if __name__ == "__main__":
    main()
