import React from 'react';
import { Box, Typography, Zoom } from '@mui/material';

const BusinessMarker = ({ type, x, y, isHovered, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <Box
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translate(-50%, -50%) scale(1.2)',
        }
      }}
    >
      {/* Punto del marcador */}
      <Box sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: isHovered ? '#ff5722' : '#3f51b5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: isHovered ? '0 0 15px rgba(255, 87, 34, 0.7)' : '0 0 5px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        position: 'relative',
      }}>
        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
          {type.charAt(0).toUpperCase()}
        </Typography>
        
        {/* Tooltip con el nombre completo */}
        <Zoom in={isHovered}>
          <Typography 
            variant="caption" 
            sx={{
              position: 'absolute',
              top: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: 2,
              fontSize: '0.8rem',
              textTransform: 'capitalize',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            {type}
          </Typography>
        </Zoom>
      </Box>
    </Box>
  );
};

export default BusinessMarker;