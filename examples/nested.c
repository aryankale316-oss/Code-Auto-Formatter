#include <stdio.h>
/* Comments, loops, array indexing, and escaped literals. */
int main(){int values[3];for(int i=0;i<3;i++)values[i]=i*2;int sum=0;int n=3;while(n>0){n--;if(values[n]!=2)sum+=values[n];else continue;}printf("Result: %d; quote: \"\n",sum);return 0;}
