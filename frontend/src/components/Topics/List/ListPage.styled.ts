import styled from 'styled-components';

export const Filters = styled.div`
  position: relative;
`;

export const FiltersPopup = styled.div(
  ({ theme: { dropdown } }) => `
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  white-space: nowrap;
  border: 1px solid ${dropdown.borderColor};
  border-radius: 4px;
  box-shadow: 0 4px 16px ${dropdown.shadow};
  background-color: ${dropdown.backgroundColor};
`
);
