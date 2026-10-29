#include <stdio.h>
// Sum the first ten positive integers.
int sum(int n){int total=0;for(int i=1;i<=n;i++){total+=i;}return total;}
int main(){int result=sum(10);if(result>0){printf("Sum: %d\n",result);}else{printf("Nothing to add.\n");}return 0;}
