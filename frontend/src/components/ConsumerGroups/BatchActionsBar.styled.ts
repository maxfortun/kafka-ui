import styled from 'styled-components';

export const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 420px;
  max-width: 100%;
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  & .react-datepicker-wrapper,
  & .react-datepicker-wrapper input {
    width: 100%;
    height: 32px;
  }
`;

export const GroupList = styled.ul`
  max-height: 160px;
  overflow-y: auto;
  margin: 0;
  padding-left: 20px;
  list-style: disc;
  word-break: break-all;
`;
