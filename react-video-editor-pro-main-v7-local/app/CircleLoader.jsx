import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

const CircleLoader = ({ size = "3rem" }) => {
  const containerStyle = {
    position: "relative",
    width: size,
    height: size,
    boxSizing: "border-box"
  };

  const circleStyle = {
    display: "block",
    width: size,
    height: size,
    border: "0.5rem solid #e9e9e9",
    borderTop: "0.5rem solid #FF4742",
    borderRadius: "50%",
    position: "absolute",
    boxSizing: "border-box",
    top: 0,
    left: 0,
  };

  const spinTransition = {
    repeat: Infinity,
    ease: "linear",
    duration: 1
  };

  return (
    <div style={containerStyle}>
      <motion.span
        style={circleStyle}
        animate={{ rotate: 360 }}
        transition={spinTransition}
      />
    </div>
  );
};

CircleLoader.propTypes = {
  size: PropTypes.string
};

export default CircleLoader;