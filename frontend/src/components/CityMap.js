import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import BusinessMarker from './BusinessMarker';
import bigCityImage from '../assets/bigcity2.png';
import eagleImage from '../assets/logotipo-gestor.png';

const CityMap = () => {
  const navigate = useNavigate();
  const [hoveredBusiness, setHoveredBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const businessData = [
      // Negocios superiores (arriba del texto)
      { id: 8, type: 'Escuela', x: 30, y: 55 },
      { id: 13, type: 'Fábrica', x: 80, y: 50 },
      { id: 10, type: 'Librería', x: 55, y: 80 },
      
      // Negocios laterales (evitando centro)
      { id: 4, type: 'Restaurante', x: 10, y: 70 },
      { id: 5, type: 'Taller mecánico', x: 20, y: 75 },
      { id: 14, type: 'Hotel', x: 10, y: 75 },
      
      // Negocios inferiores (debajo del botón)
      { id: 1, type: 'GYM', x: 2, y: 75 },
      { id: 2, type: 'Carnicería', x: 6, y: 75 },
      { id: 3, type: 'Minisupermercado', x: 15, y: 72 },
      { id: 6, type: 'Salón de belleza', x: 78, y: 67 },
      { id: 7, type: 'Bar', x: 90, y: 68 },
      { id: 11, type: 'Cafetería', x: 75, y: 60 },
      { id: 12, type: 'Farmacia', x: 85, y: 67 },
      { id: 9, type: 'Otros', x: 55, y: 35 }
    ];
    setBusinesses(businessData);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMarkerClick = (businessType) => {
    navigate('/register', {
      state: {
        fromMap: true,
        businessType: businessType
      }
    });
  };

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: `url(${bigCityImage}) no-repeat center center`,
      backgroundSize: 'cover',
      cursor: 'default',
    }}>
      {/* Overlay oscuro */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.3)',
        zIndex: 0,
      }} />

      {/* Contenedor principal de contenido */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        textAlign: 'center',
        width: '90%',
        maxWidth: '800px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}>
        {/* Bloque de título con águila debajo - MÍNIMO ESPACIO */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0, // Sin espacio entre elementos
        }}>
          {/* Título principal */}
          <Typography variant="h2" sx={{
            color: 'white',
            textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)',
            fontWeight: 'bold',
            fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.2rem' },
            lineHeight: 1.1, // Reducido para acercar al águila
            marginBottom: 0, // Sin margen inferior
          }}>
            Gestor de Nóminas Mexicanas
          </Typography>

          {/* Imagen del águila centrada debajo del título - MÁS GRANDE */}
          <Box 
            component="img"
            src={eagleImage}
            sx={{
              height: { xs: '3.5em', sm: '4.5em', md: '5em' }, // Tamaño aumentado
              filter: 'brightness(0) invert(1)',
              marginTop: 0, // Sin espacio arriba
              marginBottom: 1, // Espacio mínimo debajo del águila
            }}
            alt="Águila mexicana"
          />

          {/* Texto descriptivo */}
          <Typography variant="h5" sx={{
            color: 'white',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
            fontWeight: 'normal',
            maxWidth: '700px',
            lineHeight: 1.5,
            fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' },
            px: 2,
            marginTop: 0, // Sin espacio arriba
          }}>
            Si tu negocio es una pequeña empresa de no más de 100 empleados; 
            puedes hacer el cálculo de tu nómina gratis aquí.
          </Typography>
        </Box>
        
        {/* Botón de Login CENTRADO */}
        <Button
          component={Link}
          to="/login"
          variant="contained"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1976d2',
            padding: { xs: '12px 24px', sm: '14px 28px', md: '16px 32px' },
            fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.3rem' },
            fontWeight: 'bold',
            borderRadius: '50px',
            '&:hover': {
              backgroundColor: 'white',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            },
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            minWidth: '200px',
          }}
        >
          Iniciar Sesión
        </Button>

        {/* Subtítulos */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}>
          <Typography variant="h3" sx={{
            color: 'white',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
            fontWeight: 'bold',
            fontSize: { xs: '1.6rem', sm: '1.9rem', md: '2.2rem' },
          }}>
            ¿Cuál es tu negocio?
          </Typography>
          <Typography variant="h6" sx={{
            color: 'white',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
            fontStyle: 'italic',
            fontSize: { xs: '1rem', sm: '1.1rem', md: '1.3rem' },
          }}>
            Si aún no estás registrado, regístrate seleccionando tu tipo de negocio o con un solo{' '}
            <Link 
              to="/register" 
              state={{ fromMapClick: true }} // ← Añade esta propiedad
              style={{
                color: '#ffeb3b',
                textDecoration: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderBottom: '2px dotted #ffeb3b',
              }}
            >
              click
            </Link>.
          </Typography>
        </Box>

        
      </Box>

      {/* Marcadores de negocios - Posicionados estratégicamente */}
      {businesses.map((business) => (
        <BusinessMarker
          key={business.id}
          type={business.type}
          x={business.x}
          y={business.y}
          isHovered={hoveredBusiness === business.type}
          isMobile={isMobile}
          onClick={() => handleMarkerClick(business.type)}
          onMouseEnter={() => setHoveredBusiness(business.type)}
          onMouseLeave={() => setHoveredBusiness(null)}
        />
      ))}
    </Box>
  );
};

export default CityMap;