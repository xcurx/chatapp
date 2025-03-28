import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="loader" />
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .loader::before,
  .loader::after {
    content: "";
    position: absolute;
    border-radius: inherit;
  }

  .loader::before {
    width: 100%;
    height: 100%;
    background-image: linear-gradient(0deg, #ff00cc 0%, #333399 100%);
    animation: load012323 .5s infinite linear;
  }

  .loader::after {
    width: 85%;
    height: 85%;
    background-color: #222;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes load012323 {
    to {
      transform: rotate(360deg);
    }
  }`;

export default Loader;
