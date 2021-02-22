export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    console.log('boop 1 aaa');
  }
  return a + b;
};
