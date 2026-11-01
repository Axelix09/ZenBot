const DEFAULT_THEME = {
  borderTop: '「 {title} 」',
  borderBottom: '',
  bullet: '• ',
  arrow: ' — '
};

export const Renderer = {
  drawInterface(title, rows = [], footer = null, theme = DEFAULT_THEME) {
    const formattedRows = rows.map(row => {
      if (row === '') return '';
      
      if (typeof row === 'string') {
        if (row.trim().startsWith('「') || row.startsWith(' ') || row.trim().startsWith('✦')) {
          return row;
        }
        return ` ${theme.bullet}${row}`;
      }
      
      const [key, val] = Object.entries(row)[0];
      return ` ${theme.bullet}${key}${theme.arrow}${val}`;
    });

    const lines = [
      theme.borderTop.replace('{title}', title.toUpperCase()),
      '',
      ...formattedRows
    ];

    if (theme.borderBottom) {
      lines.push('', theme.borderBottom);
    }

    if (footer) {
      lines.push('', `↳ ${footer}`);
    }

    return lines.join('\n');
  }
};