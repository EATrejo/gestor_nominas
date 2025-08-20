import React from 'react';
import { Box, Typography, Zoom } from '@mui/material';

const BusinessMarker = ({ 
  type, 
  x, 
  y, 
  isHovered, 
  isMobile,
  onClick, 
  onMouseEnter, 
  onMouseLeave,
  color = '#1976d2',
  textColor = 'black'
}) => {
  // Ocultar completamente las etiquetas en móviles (≤768px)
  if (isMobile) {
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
          zIndex: 5,
          cursor: 'pointer',
        }}
      >
        {/* Solo mostrar el pin básico sin etiqueta */}
        <Box sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `3px solid ${color}`,
          boxShadow: '0 0 8px rgba(0,0,0,0.3)',
        }}>
          <Box sx={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: color,
          }} />
        </Box>
      </Box>
    );
  }

  // Comportamiento normal para desktop
  const shouldShowLabel = isHovered;

  const getLabelPosition = () => {
    if (y <= 40) return 'bottom';
    if (y >= 70) return 'top';
    if (x <= 30) return 'right';
    if (x >= 70) return 'left';
    return 'top';
  };

  const labelPosition = getLabelPosition();

  const labelStyles = {
    top: {
      position: 'absolute',
      bottom: '45px',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      position: 'absolute',
      top: '45px',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      position: 'absolute',
      right: '45px',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      position: 'absolute',
      left: '45px',
      top: '50%',
      transform: 'translateY(-50%)',
    }
  };

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
        zIndex: 5,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translate(-50%, -50%) scale(1.15)',
          zIndex: 20,
        }
      }}
    >
      {/* Punto del marcador */}
      <Box sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
        fontWeight: 'bold',
        border: `3px solid ${color}`,
        boxShadow: isHovered ? `0 0 20px ${color}` : '0 0 10px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        position: 'relative',
        fontSize: '0.8rem',
        transition: 'all 0.3s ease',
      }}>
        {/* Indicador interno */}
        <Box sx={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.6rem',
          fontWeight: 'bold',
        }}>
          {type.charAt(0)}
        </Box>

        {/* Tooltip solo para desktop */}
        <Zoom in={shouldShowLabel} timeout={250}>
          <Typography 
            variant="caption" 
            sx={{
              ...labelStyles[labelPosition],
              whiteSpace: 'nowrap',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: 'black',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.95rem',
              textTransform: 'capitalize',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              fontWeight: 'bold',
              border: `2px solid ${color}`,
              minWidth: '120px',
              textAlign: 'center',
              backdropFilter: 'blur(5px)',
              zIndex: 25,
              ...(y <= 40 && { 
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: `3px solid ${color}`,
              })
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